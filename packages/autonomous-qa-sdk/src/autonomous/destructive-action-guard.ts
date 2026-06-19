import type { AutonomousAction } from 'autonomous-agent-contracts';

const DESTRUCTIVE_CLICK_HINT =
  /\b(pay|place\s+order|delete|remove|confirm\s+payment|purchase|submit\s+order|cancel\s+subscription|transfer\s+funds)\b/i;

const GOAL_ALLOWS_DESTRUCTIVE =
  /\b(place\s+order|complete\s+purchase|pay\b|confirm\s+payment|submit\s+order|allow\s+destructive|purchase\s+flow|proceed\s+to\s+checkout)\b/i;

export function isDestructiveAutonomousAction(action: AutonomousAction): boolean {
  if (action.type !== 'click') return false;
  return DESTRUCTIVE_CLICK_HINT.test(action.targetHint);
}

export function goalExplicitlyAllowsDestructiveActions(goal: string): boolean {
  return GOAL_ALLOWS_DESTRUCTIVE.test(goal);
}

export function isDestructiveActionAllowed(params: {
  goal: string;
  action: AutonomousAction;
  allowDestructiveActions?: boolean;
}): boolean {
  if (!isDestructiveAutonomousAction(params.action)) return true;
  if (params.allowDestructiveActions === true) return true;
  if (process.env.AUTONOMOUS_ALLOW_DESTRUCTIVE === '1') return true;
  return goalExplicitlyAllowsDestructiveActions(params.goal);
}

export function destructiveActionBlockedReason(action: AutonomousAction): string {
  const hint = action.type === 'click' ? action.targetHint : action.type;
  return `Destructive action blocked (Phase 16 safety): "${hint}" requires explicit goal permission (e.g. "place order", "complete purchase") or AUTONOMOUS_ALLOW_DESTRUCTIVE=1`;
}
