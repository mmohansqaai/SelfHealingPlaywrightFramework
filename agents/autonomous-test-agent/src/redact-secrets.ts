import type { AutonomousSecrets } from 'autonomous-agent-contracts';

const PLACEHOLDER_EMAIL = /\{\{(?:CUSTOMER_)?EMAIL\}\}/g;
const PLACEHOLDER_PASSWORD = /\{\{(?:CUSTOMER_)?PASSWORD\}\}/g;

/** Redact credentials before LLM prompts (Phase 13). */
export function redactSecretsInGoalText(
  text: string,
  secrets: AutonomousSecrets = {}
): string {
  let redacted = text.replace(PLACEHOLDER_EMAIL, '{{REDACTED_EMAIL}}').replace(PLACEHOLDER_PASSWORD, '{{REDACTED_PASSWORD}}');
  if (secrets.customerEmail && secrets.customerEmail.length > 2) {
    redacted = redacted.split(secrets.customerEmail).join('{{REDACTED_EMAIL}}');
  }
  if (secrets.customerPassword && secrets.customerPassword.length > 2) {
    redacted = redacted.split(secrets.customerPassword).join('{{REDACTED_PASSWORD}}');
  }
  return redacted;
}
