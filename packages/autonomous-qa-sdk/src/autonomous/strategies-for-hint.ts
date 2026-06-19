import type { Page } from '@playwright/test';
import type { LocatorStrategy } from 'ai-healing-sdk';

/** Hint-based locator strategies — no pre-written test locators; agent discovers at runtime. */
export function strategiesForHint(targetHint: string, action: 'fill' | 'click' | 'visible'): LocatorStrategy[] {
  const h = targetHint.toLowerCase();

  if (h.includes('password') || h.includes('pass')) {
    return [
      { name: 'hint-label-password', resolve: (p) => p.getByLabel(/password/i) },
      { name: 'hint-css-password', resolve: (p) => p.locator('input[type="password"]').first() },
      { name: 'hint-name-password', resolve: (p) => p.locator('input[name*="password" i]').first() },
    ];
  }

  if (h.includes('email') || h.includes('mail') || (action === 'fill' && h.includes('user'))) {
    return [
      { name: 'hint-label-email', resolve: (p) => p.getByLabel(/email/i) },
      { name: 'hint-role-email-textbox', resolve: (p) => p.getByRole('textbox', { name: /email/i }) },
      { name: 'hint-css-email', resolve: (p) => p.locator('input[type="email"]').first() },
      { name: 'hint-name-email', resolve: (p) => p.locator('input[name*="email" i]').first() },
    ];
  }

  if (h.includes('add to cart') || h.includes('add item') || (h.includes('add') && h.includes('cart'))) {
    return [
      { name: 'hint-add-to-cart', resolve: (p) => p.getByRole('button', { name: /add to cart/i }).first() },
      { name: 'hint-add-item', resolve: (p) => p.getByRole('button', { name: /add item/i }).first() },
      { name: 'hint-card-primary', resolve: (p) => p.locator('.rw-card-actions .rw-btn-primary').first() },
    ];
  }

  if (h.includes('checkout')) {
    return [
      { name: 'hint-checkout-btn', resolve: (p) => p.getByRole('button', { name: /^checkout$/i }) },
      {
        name: 'hint-checkout-primary',
        resolve: (p) => p.locator('.rw-row .rw-btn-primary').filter({ hasText: /checkout/i }).first(),
      },
    ];
  }

  if (h.includes('pay') || h.includes('place order')) {
    return [
      { name: 'hint-place-order', resolve: (p) => p.locator('#place-order') },
      { name: 'hint-pay-btn', resolve: (p) => p.getByRole('button', { name: /pay\s*\$/i }) },
      { name: 'hint-form-submit', resolve: (p) => p.locator('form.rw-form .rw-btn-primary').first() },
    ];
  }

  if (h.includes('product') || h.includes('catalog') || h.includes('storefront')) {
    return [
      { name: 'hint-products-heading', resolve: (p) => p.getByRole('heading', { name: /^(Products|Catalog)$/i }) },
      { name: 'hint-storefront', resolve: (p) => p.getByText('Storefront').first() },
      { name: 'hint-search', resolve: (p) => p.getByPlaceholder(/search products/i) },
    ];
  }

  if (h.includes('cart') && action === 'visible') {
    return [
      { name: 'hint-cart-text', resolve: (p) => p.getByText(/cart|item|total/i).first() },
      { name: 'hint-cart-row', resolve: (p) => p.locator('.rw-table-row, .rw-card').first() },
    ];
  }

  if (h.includes('confirmed') || h.includes('success') || h.includes('thank')) {
    return [
      { name: 'hint-confirmed', resolve: (p) => p.getByText(/confirmed|success|thank you/i).first() },
      { name: 'hint-rw-success', resolve: (p) => p.locator('.rw-success').first() },
    ];
  }

  if (action === 'click' || h.includes('sign in') || h.includes('signin') || h.includes('submit') || h.includes('login')) {
    return [
      { name: 'hint-role-signin', resolve: (p) => p.getByRole('button', { name: /sign in/i }) },
      { name: 'hint-role-login', resolve: (p) => p.getByRole('button', { name: /log in/i }) },
      { name: 'hint-css-submit', resolve: (p) => p.locator('button[type="submit"]').first() },
    ];
  }

  if (h.includes('heading') || h.includes('title')) {
    return [{ name: 'hint-heading', resolve: (p) => p.getByRole('heading').first() }];
  }

  return [
    { name: 'hint-generic-button', resolve: (p) => p.getByRole('button').first() },
    { name: 'hint-generic-input', resolve: (p) => p.locator('input').first() },
  ];
}

export function strategiesForHeading(textHint: string): LocatorStrategy[] {
  const parts = textHint.split('|').map((p) => p.trim()).filter(Boolean);
  const pattern = parts.length > 1 ? new RegExp(parts.join('|'), 'i') : new RegExp(textHint, 'i');
  return [
    { name: 'hint-heading-role', resolve: (p) => p.getByRole('heading', { name: pattern }) },
    { name: 'hint-heading-filter', resolve: (p) => p.getByRole('heading').filter({ hasText: pattern }).first() },
    { name: 'hint-text-heading', resolve: (p) => p.getByText(pattern).first() },
  ];
}

export function strategiesForText(textHint: string): LocatorStrategy[] {
  const parts = textHint.split('|').map((p) => p.trim()).filter(Boolean);
  const pattern = parts.length > 1 ? new RegExp(parts.join('|'), 'i') : new RegExp(textHint, 'i');
  return [
    { name: 'hint-body-text', resolve: (p) => p.getByText(pattern).first() },
    { name: 'hint-locator-body', resolve: (p) => p.locator('body') },
  ];
}

export function assertDomainAllowed(page: Page, allowedDomains?: string[]): void {
  if (!allowedDomains?.length) return;
  const host = new URL(page.url()).hostname;
  if (!allowedDomains.some((d) => host === d || host.endsWith(`.${d}`))) {
    throw new Error(`Domain ${host} not in allowed list: ${allowedDomains.join(', ')}`);
  }
}
