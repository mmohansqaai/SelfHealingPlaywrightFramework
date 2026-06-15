/** Extract email/password from natural-language login goals. */
function cleanCredentialToken(token: string): string {
  return token.replace(/^[^\w@.+/-]+|[^\w]+$/g, '');
}

export function parseLoginCredentials(goal: string): { email: string; password: string } | null {
  const normalized = goal.replace(/\s+/g, ' ').trim();

  const emailMatch = normalized.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  if (!emailMatch) return null;

  const slashPair = normalized.match(/@[\w.-]+\.[A-Za-z]{2,}\s*[\/]\s*(\S+)/);
  if (slashPair) {
    return { email: emailMatch[0], password: cleanCredentialToken(slashPair[1]) };
  }

  const withPassword = normalized.match(/password\s*[:\s]+(\S+)/i);
  if (withPassword) {
    return { email: emailMatch[0], password: cleanCredentialToken(withPassword[1]) };
  }

  const afterEmail = normalized.split(emailMatch[0])[1]?.trim();
  const token = afterEmail?.split(/\s+/).find((t) => t.length >= 4 && !/^(and|with|then|the|login|log|in|to|leave|page|as|,)$/i.test(t));
  if (token) {
    return { email: emailMatch[0], password: cleanCredentialToken(token) };
  }

  return null;
}

export function isLoginGoal(goal: string): boolean {
  const g = goal.toLowerCase();
  return /\blog\s*in\b|\blogin\b|\bsign\s*in\b/.test(g) && parseLoginCredentials(goal) !== null;
}

export function isCheckoutGoal(goal: string): boolean {
  const g = goal.toLowerCase();
  return (
    /\bcheckout\b/.test(g) ||
    /\badd\b.*\b(cart|product)\b/.test(g) ||
    /\breach checkout\b/.test(g) ||
    /\bgo to cart\b/.test(g)
  );
}

export function isProductsGoal(goal: string): boolean {
  const g = goal.toLowerCase();
  return /\bproducts\b|\bcatalog\b|\bstorefront\b/.test(g);
}

export function isPlaceOrderGoal(goal: string): boolean {
  const g = goal.toLowerCase();
  return /\bplace order\b|\bpay\b|\bcomplete purchase\b|\border confirmed\b/.test(g);
}
