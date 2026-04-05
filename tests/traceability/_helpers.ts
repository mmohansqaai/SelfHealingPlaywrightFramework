import type { Page, TestInfo } from '@playwright/test';
import { expect } from '@playwright/test';
import { attachHealingSummary } from '../../core/healing-reporter';
import type { HealingResult, LocatorStrategy } from '../../core/healing-types';
import { clickHealing, expectVisibleHealing, fillHealing } from '../../core/self-healing';
import { LoginPage } from '../../pages/login.page';

export const RETAIL_HOST = 'retail-website-two.vercel.app';

/** Customer demo (storefront + checkout). */
export const CUSTOMER_EMAIL = 'test@demo.com';
export const CUSTOMER_PASSWORD = 'password123';

export function expectHttpsUrl(url: string): void {
  expect(url, 'URL must use HTTPS').toMatch(/^https:\/\//);
}

export async function healingClick(
  page: Page,
  testInfo: TestInfo | undefined,
  label: string,
  strategies: LocatorStrategy[],
  options?: { timeoutPerStrategyMs?: number; force?: boolean }
): Promise<HealingResult<void>> {
  const result = await clickHealing(page, strategies, options);
  if (testInfo) await attachHealingSummary(testInfo, label, result);
  return result;
}

export async function healingFill(
  page: Page,
  testInfo: TestInfo | undefined,
  label: string,
  strategies: LocatorStrategy[],
  value: string,
  options?: { timeoutPerStrategyMs?: number }
): Promise<HealingResult<void>> {
  const result = await fillHealing(page, strategies, value, options);
  if (testInfo) await attachHealingSummary(testInfo, label, result);
  return result;
}

export async function healingExpectVisible(
  page: Page,
  testInfo: TestInfo | undefined,
  label: string,
  strategies: LocatorStrategy[],
  options?: { timeoutPerStrategyMs?: number }
): Promise<HealingResult<void>> {
  const result = await expectVisibleHealing(page, strategies, options);
  if (testInfo) await attachHealingSummary(testInfo, label, result);
  return result;
}

/**
 * Storefront login using page-object self-healing locators; attaches attempt traces when testInfo is set.
 */
export async function loginAsCustomer(page: Page, testInfo?: TestInfo): Promise<void> {
  const login = new LoginPage(page);
  await login.goto();
  const loaded = await login.expectLoaded();
  if (testInfo) await attachHealingSummary(testInfo, 'login-heading', loaded);
  const email = await login.fillEmail(CUSTOMER_EMAIL);
  if (testInfo) await attachHealingSummary(testInfo, 'login-email', email);
  const password = await login.fillPassword(CUSTOMER_PASSWORD);
  if (testInfo) await attachHealingSummary(testInfo, 'login-password', password);
  const submit = await login.submit();
  if (testInfo) await attachHealingSummary(testInfo, 'login-submit', submit);
  await page.waitForURL(/\/app(\/|$)/, { timeout: 25_000 });
}

export async function loginAsAdmin(page: Page, testInfo?: TestInfo): Promise<void> {
  const login = new LoginPage(page);
  await login.goto();
  const loaded = await login.expectLoaded();
  if (testInfo) await attachHealingSummary(testInfo, 'admin-login-heading', loaded);
  const email = await login.fillEmail('admin@demo.com');
  if (testInfo) await attachHealingSummary(testInfo, 'admin-email', email);
  const password = await login.fillPassword('admin123');
  if (testInfo) await attachHealingSummary(testInfo, 'admin-password', password);
  const submit = await login.submit();
  if (testInfo) await attachHealingSummary(testInfo, 'admin-submit', submit);
  await page.waitForURL(/\/app(\/|$)/, { timeout: 25_000 });
}
