import { test, expect } from '@playwright/test';
import {
  approveMaintenanceProposal,
  buildMaintenanceTicket,
  extractPlannerHintsFromTrace,
  findProposalsForFailure,
  formatMaintenancePrBody,
  listApprovedProposals,
  maintenanceDescriptionToAdf,
  openMaintenanceDraftPr,
} from 'ai-healing-sdk';
import type { MaintenancePersistenceProposal } from 'autonomous-agent-contracts';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test.describe('Phase 15 maintenance closed loop unit', () => {
  test('extractPlannerHintsFromTrace captures replanned steps', () => {
    const hints = extractPlannerHintsFromTrace([
      {
        stepIndex: 0,
        stepId: 'fill-email',
        action: { type: 'fill', targetHint: 'email input field', value: 'x' },
        ok: false,
        error: 'not found',
        durationMs: 10,
      },
      {
        stepIndex: 1,
        stepId: 'llm-replan-retry',
        action: { type: 'click', targetHint: 'sign in button submit login' },
        ok: true,
        replanned: true,
        durationMs: 20,
        pageUrl: 'https://x/login',
      },
    ]);

    expect(hints.length).toBeGreaterThanOrEqual(1);
    expect(hints.some((h) => h.replanned)).toBe(true);
  });

  test('buildMaintenanceTicket links proposals and planner hints', () => {
    const failure = {
      id: 'fill-email|email|/login',
      stepId: 'fill-email',
      targetHint: 'email input field',
      pageUrl: 'https://example.com/login',
      failureCount: 3,
      lastError: 'timeout',
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };
    const proposal: MaintenancePersistenceProposal = {
      proposalId: 'prop-fill-email-1',
      stepId: 'fill-email',
      targetHint: 'email input field',
      targetFile: 'pages/login.page.ts',
      methodName: 'emailStrategies',
      candidate: {
        strategyName: 'maint-email',
        score: 90,
        reason: 'healed',
        query: { type: 'css', value: 'input[type=email]' },
      },
      patchSnippet: '{ name: "maint-email", resolve: (p) => p.locator("input") }',
      status: 'pending_review',
      createdAt: new Date().toISOString(),
    };

    const ticket = buildMaintenanceTicket(failure, 'jira', {
      linkedProposals: [proposal],
      plannerHints: [{ stepId: 'llm-replan-retry', actionType: 'click', replanned: true, targetHint: 'sign in button submit login' }],
    });

    expect(ticket.description).toContain('Linked locator proposals');
    expect(ticket.description).toContain('prop-fill-email-1');
    expect(ticket.description).toContain('LLM replan');
    expect(ticket.linkedProposals?.length).toBe(1);
  });

  test('maintenanceDescriptionToAdf preserves fenced code blocks', () => {
    const adf = maintenanceDescriptionToAdf('Intro\n```typescript\nconst x = 1;\n```\nTail');
    const content = (adf as { content: Array<{ type: string }> }).content;
    expect(content.some((n) => n.type === 'codeBlock')).toBe(true);
  });

  test('approveMaintenanceProposal marks proposal approved', () => {
    const dir = mkdtempSync(join(tmpdir(), 'maint-p15-'));
    const proposalPath = join(dir, 'prop-test.json');
    writeFileSync(
      proposalPath,
      JSON.stringify(
        {
          proposalId: 'prop-test',
          stepId: 'fill-email',
          targetHint: 'email input field',
          targetFile: 'pages/login.page.ts',
          methodName: 'emailStrategies',
          candidate: { strategyName: 'x', score: 80, reason: 'y', query: { type: 'css', value: 'input' } },
          patchSnippet: 'snippet',
          status: 'pending_review',
          createdAt: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf8'
    );

    const approved = approveMaintenanceProposal(proposalPath);
    expect(approved.ok).toBe(true);
    if (approved.ok) {
      expect(approved.proposal.status).toBe('approved');
    }
    expect(listApprovedProposals(dir)).toHaveLength(1);

    rmSync(dir, { recursive: true, force: true });
  });

  test('findProposalsForFailure matches step id or hint', () => {
    const failure = {
      id: 'x',
      stepId: 'fill-email',
      targetHint: 'email input field',
      pageUrl: '/login',
      failureCount: 3,
      firstSeenAt: '',
      lastSeenAt: '',
    };
    const proposals: MaintenancePersistenceProposal[] = [
      {
        proposalId: 'p1',
        stepId: 'fill-email',
        targetHint: 'email input field',
        targetFile: 'pages/login.page.ts',
        methodName: 'emailStrategies',
        candidate: { strategyName: 's', score: 1, reason: 'r', query: { type: 'css', value: 'x' } },
        patchSnippet: 'x',
        status: 'pending_review',
        createdAt: '',
      },
    ];
    expect(findProposalsForFailure(failure, proposals)).toHaveLength(1);
  });

  test('openMaintenanceDraftPr dry run lists approved without applying', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'maint-pr-'));
    const patches = join(dir, 'patches');
    mkdirSync(patches, { recursive: true });
    writeFileSync(
      join(patches, 'prop-a.json'),
      JSON.stringify(
        {
          proposalId: 'prop-a',
          stepId: 'fill-email',
          targetHint: 'email input field',
          targetFile: 'pages/login.page.ts',
          methodName: 'emailStrategies',
          candidate: { strategyName: 's', score: 1, reason: 'r', query: { type: 'css', value: 'x' } },
          patchSnippet: 'x',
          status: 'approved',
          createdAt: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf8'
    );

    const result = await openMaintenanceDraftPr({ outputDir: dir, dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.proposalsApplied).toContain('prop-a');
    expect(result.opened).toBe(false);

    rmSync(dir, { recursive: true, force: true });
  });

  test('formatMaintenancePrBody lists proposals', () => {
    const body = formatMaintenancePrBody([
      {
        proposalId: 'prop-a',
        stepId: 's',
        targetHint: 'h',
        targetFile: 'pages/login.page.ts',
        methodName: 'emailStrategies',
        candidate: { strategyName: 'maint', score: 88, reason: 'r', query: { type: 'css', value: 'x' } },
        patchSnippet: 'x',
        status: 'approved',
        createdAt: '',
      },
    ]);
    expect(body).toContain('prop-a');
    expect(body).toContain('Test plan');
  });
});
