import type { AutonomousSecrets } from 'autonomous-agent-contracts';
import { resolveAutonomousSecretsFromEnv } from '../autonomous/governance';

/** Redact injected credentials before sending goals to LLM prompts or traces. */
export function redactSecretsInText(
  text: string,
  secrets: AutonomousSecrets = resolveAutonomousSecretsFromEnv()
): string {
  let redacted = text;
  if (secrets.customerEmail && secrets.customerEmail.length > 2) {
    redacted = redacted.split(secrets.customerEmail).join('{{REDACTED_EMAIL}}');
  }
  if (secrets.customerPassword && secrets.customerPassword.length > 2) {
    redacted = redacted.split(secrets.customerPassword).join('{{REDACTED_PASSWORD}}');
  }
  return redacted;
}
