import type { Page } from '@playwright/test';
import { scanDomElements } from '../core/discovery/dom-scan-discovery';
import { failureHints } from '../core/discovery/intent-hints';
import type { HealingAttempt, HealingActionType } from '../core/healing-types';
import type { AgentHealContext, AgentValidationResult, HealingRequest } from '../transport/contracts';

export async function buildHealingRequest(
  page: Page,
  actionType: HealingActionType,
  attempts: HealingAttempt[],
  options?: {
    framework?: HealingRequest['framework'];
    agentContext?: AgentHealContext;
    priorValidationResults?: AgentValidationResult[];
  }
): Promise<HealingRequest> {
  const domSnapshot = await scanDomElements(page, actionType);
  const hints = failureHints(attempts);
  const lastFailed = [...attempts].reverse().find((a) => !a.ok);

  let pageTitle: string | undefined;
  try {
    pageTitle = await page.title();
  } catch {
    pageTitle = undefined;
  }

  const agentContext: AgentHealContext = {
    iteration: options?.agentContext?.iteration ?? 0,
    maxIterations: options?.agentContext?.maxIterations ?? 3,
    agentMode: 'agentic',
    priorValidationResults: options?.priorValidationResults ?? options?.agentContext?.priorValidationResults,
    testStepDescription: options?.agentContext?.testStepDescription,
  };

  return {
    framework: options?.framework ?? 'playwright',
    action: actionType,
    failedLocator: lastFailed?.strategy ?? 'unknown',
    error: lastFailed?.error ?? 'unknown failure',
    url: page.url(),
    pageTitle,
    domSnapshot,
    failureHints: hints,
    agentContext,
  };
}
