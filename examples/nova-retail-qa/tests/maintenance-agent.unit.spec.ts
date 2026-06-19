import '../src/register-locator-targets';
import { test, expect } from '@playwright/test';
import {
  buildMaintenanceTicket,
  createPersistenceProposal,
  previewPersistencePatch,
  recordMaintenanceFailure,
  listMaintenanceFailures,
  runMaintenanceAgent,
  resolveLocatorTarget,
  formatJiraIssueFields,
} from 'autonomous-qa-sdk';
import type { AutonomousRunResult } from 'autonomous-agent-contracts';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test.describe('Phase 11 maintenance agent unit', () => {
  test('resolveLocatorTarget maps login email hint', () => {
    const target = resolveLocatorTarget('email input field');
    expect(target?.filePath).toMatch(/pages\/login\.page\.ts$/);
    expect(target?.methodName).toBe('emailStrategies');
  });

  test('recordMaintenanceFailure increments failure count', () => {
    const dir = mkdtempSync(join(tmpdir(), 'maint-fail-'));
    const store = join(dir, 'failures.json');
    process.env.MAINTENANCE_FAILURE_STORE = store;

    const first = recordMaintenanceFailure({
      stepId: 'fill-email',
      targetHint: 'email input field',
      pageUrl: 'https://example.com/login',
      error: 'timeout',
    });
    const second = recordMaintenanceFailure({
      stepId: 'fill-email',
      targetHint: 'email input field',
      pageUrl: 'https://example.com/login',
      error: 'timeout again',
    });

    expect(first.failureCount).toBe(1);
    expect(second.failureCount).toBe(2);
    expect(listMaintenanceFailures(2, store)).toHaveLength(1);

    rmSync(dir, { recursive: true, force: true });
    delete process.env.MAINTENANCE_FAILURE_STORE;
  });

  test('buildMaintenanceTicket formats Jira payload', () => {
    const failure = {
      id: 'fill-email|email|/login',
      stepId: 'fill-email',
      targetHint: 'email input field',
      pageUrl: 'https://example.com/login',
      failureCount: 3,
      lastError: 'not found',
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };
    const ticket = buildMaintenanceTicket(failure, 'jira');
    const jira = formatJiraIssueFields(ticket);
    expect(ticket.title).toContain('fill-email');
    expect(jira.fields).toBeTruthy();
  });

  test('previewPersistencePatch returns snippet without writing source', () => {
    const root = mkdtempSync(join(tmpdir(), 'maint-patch-'));
    const targetFile = join(root, 'login.page.ts');
    writeFileSync(
      targetFile,
      [
        'class LoginPage {',
        '  private emailStrategies(): LocatorStrategy[] {',
        '    return [',
        '      { name: "getByLabel-Email", resolve: (p) => p.getByLabel(/email/i) },',
        '    ];',
        '  }',
        '}',
      ].join('\n'),
      'utf8'
    );

    const preview = previewPersistencePatch({
      target: { filePath: targetFile, methodName: 'emailStrategies' },
      candidate: {
        strategyName: 'maint-autogen-email',
        query: { type: 'css', value: 'input[type="email"]' },
        score: 92,
        reason: 'maintenance agent proposal',
      },
      minConfidence: 70,
      validationPasses: 2,
    });

    expect(preview.ok).toBe(true);
    if (preview.ok) {
      expect(preview.snippet).toContain('maint-autogen-email');
    }

    const proposal = createPersistenceProposal({
      stepId: 'fill-email',
      targetHint: 'email input field',
      candidate: {
        strategyName: 'maint-autogen-email',
        query: { type: 'css', value: 'input[type="email"]' },
        score: 92,
        reason: 'maintenance agent proposal',
      },
    });
    expect('proposalId' in proposal).toBe(true);

    rmSync(root, { recursive: true, force: true });
  });

  test('runMaintenanceAgent records failures from autonomous result', () => {
    const dir = mkdtempSync(join(tmpdir(), 'maint-run-'));
    process.env.MAINTENANCE_OUTPUT_DIR = dir;
    process.env.MAINTENANCE_FAILURE_STORE = join(dir, 'failures.json');
    process.env.MAINTENANCE_TICKET_THRESHOLD = '1';

    const result = {
      status: 'failed',
      goal: 'demo',
      planner: 'mock',
      stepsExecuted: 1,
      replanCount: 0,
      trace: [
        {
          stepIndex: 0,
          stepId: 'fill-email',
          action: { type: 'fill', targetHint: 'email input field', value: 'x' },
          ok: false,
          error: 'element not found',
          pageUrl: 'https://example.com/login',
          durationMs: 100,
        },
      ],
      verifications: [],
      verification: { passed: false, detail: 'failed' },
      reasoning: 'test',
      governance: {
        estimatedCostUsd: 0.01,
        durationMs: 100,
        needsHumanReview: true,
        domainAllowed: true,
        plannerModeUsed: 'mock',
        costCapExceeded: false,
      },
    } as AutonomousRunResult;

    const maintenance = runMaintenanceAgent(result, { failureThreshold: 1, outputDir: dir });
    expect(maintenance.tickets.length).toBeGreaterThanOrEqual(1);
    expect(maintenance.repeatedFailures.length).toBeGreaterThanOrEqual(1);

    rmSync(dir, { recursive: true, force: true });
    delete process.env.MAINTENANCE_OUTPUT_DIR;
    delete process.env.MAINTENANCE_FAILURE_STORE;
    delete process.env.MAINTENANCE_TICKET_THRESHOLD;
  });
});
