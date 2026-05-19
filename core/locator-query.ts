import type { Page } from '@playwright/test';
import type { GeneratedLocatorQuery } from './healing-types';

export function queryKey(query: GeneratedLocatorQuery): string {
  if (query.type === 'css') return `css:${query.value}`;
  return `role:${query.role}:${query.name}`;
}

export function resolveQuery(page: Page, query: GeneratedLocatorQuery) {
  if (query.type === 'css') return page.locator(query.value).first();
  return page.getByRole(query.role, { name: new RegExp(escapeRegExp(query.name), 'i') }).first();
}

export function generatedQueryToLocatorFactory(query: GeneratedLocatorQuery) {
  return (page: Page) => {
    if (query.type === 'css') return page.locator(query.value);
    return page.getByRole(query.role, { name: new RegExp(escapeRegExp(query.name), 'i') });
  };
}

export function generatedQueryKey(query: GeneratedLocatorQuery): string {
  return queryKey(query);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
