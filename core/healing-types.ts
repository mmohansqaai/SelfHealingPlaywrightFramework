import type { Locator, Page } from '@playwright/test';

/** One way to resolve a locator; used in ordered fallback chains. */
export type LocatorStrategy = {
  name: string;
  resolve: (page: Page) => Locator;
};

export type HealingAttempt = {
  strategy: string;
  ok: boolean;
  error?: string;
};

export type HealingResult<T> = {
  value: T;
  usedStrategy: string;
  attempts: HealingAttempt[];
};
