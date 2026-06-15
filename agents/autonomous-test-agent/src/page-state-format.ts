import type { AutonomousPageState } from 'autonomous-agent-contracts';

export function formatPageStateForPrompt(pageState?: AutonomousPageState): string {
  if (!pageState) return '(page state not available)';

  const lines = [
    `URL: ${pageState.url}`,
    `Title: ${pageState.title}`,
    pageState.domElementCount !== undefined ? `Interactive elements scanned: ${pageState.domElementCount}` : '',
  ].filter(Boolean);

  if (pageState.interactiveElements?.length) {
    lines.push('', 'Visible interactive elements (use targetHint to match labels):');
    for (const el of pageState.interactiveElements.slice(0, 35)) {
      const role = el.role ? `[${el.role}]` : '';
      const input = el.inputType ? ` (${el.inputType})` : '';
      lines.push(`- ${el.tag}${input}${role}: "${el.label}"`);
    }
  }

  return lines.join('\n');
}
