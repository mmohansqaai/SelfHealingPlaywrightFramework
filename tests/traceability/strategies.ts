import type { LocatorStrategy } from '../../core/healing-types';

/** Visible body / root for smoke checks. */
export function bodyVisibleStrategies(): LocatorStrategy[] {
  return [{ name: 'body', resolve: (p) => p.locator('body') }];
}

export function mainLandmarkStrategies(): LocatorStrategy[] {
  return [
    { name: 'role-main', resolve: (p) => p.locator('main') },
    { name: 'id-root', resolve: (p) => p.locator('#root') },
  ];
}

export function searchProductsStrategies(): LocatorStrategy[] {
  return [
    { name: 'placeholder-search-products', resolve: (p) => p.getByPlaceholder(/search products/i) },
    { name: 'role-searchbox', resolve: (p) => p.getByRole('searchbox') },
    {
      name: 'input-search-like',
      resolve: (p) => p.locator('input[type="search"], input[placeholder*="search" i]').first(),
    },
  ];
}

export function addToCartStrategies(): LocatorStrategy[] {
  return [
    {
      name: 'role-button-Add-to-cart',
      resolve: (p) => p.getByRole('button', { name: /add to cart/i }).first(),
    },
    {
      name: 'role-button-Add-item',
      resolve: (p) => p.getByRole('button', { name: /add item/i }).first(),
    },
    {
      name: 'card-primary-action',
      resolve: (p) => p.locator('.rw-card-actions .rw-btn-primary').first(),
    },
  ];
}

/** Second product on PLP (multi-item cart). */
export function addSecondProductStrategies(): LocatorStrategy[] {
  return [
    {
      name: 'add-to-cart-index-1',
      resolve: (p) => p.getByRole('button', { name: /add to cart/i }).nth(1),
    },
    {
      name: 'add-item-index-1',
      resolve: (p) => p.getByRole('button', { name: /add item/i }).nth(1),
    },
  ];
}

export function cartIconStrategies(): LocatorStrategy[] {
  return [
    { name: 'role-button-cart', resolve: (p) => p.getByRole('button', { name: /cart/i }) },
    { name: 'role-link-cart', resolve: (p) => p.getByRole('link', { name: /cart/i }) },
  ];
}

export function checkoutStrategies(): LocatorStrategy[] {
  return [
    { name: 'role-button-Checkout', resolve: (p) => p.getByRole('button', { name: /^checkout$/i }) },
    {
      name: 'primary-checkout',
      resolve: (p) => p.locator('.rw-row .rw-btn-primary').filter({ hasText: /checkout/i }).first(),
    },
  ];
}

export function payOrderStrategies(): LocatorStrategy[] {
  return [
    { name: 'id-place-order', resolve: (p) => p.locator('#place-order') },
    { name: 'role-button-Pay', resolve: (p) => p.getByRole('button', { name: /pay\s*\$/i }) },
    { name: 'form-primary-submit', resolve: (p) => p.locator('form.rw-form .rw-btn-primary').first() },
  ];
}

export function viewProductStrategies(): LocatorStrategy[] {
  return [
    { name: 'role-link-View', resolve: (p) => p.getByRole('link', { name: /^view$/i }).first() },
    { name: 'card-first-link', resolve: (p) => p.locator('.rw-card a').first() },
  ];
}

export function productsLinkStrategies(): LocatorStrategy[] {
  return [
    { name: 'role-link-Products', resolve: (p) => p.getByRole('link', { name: /^products$/i }) },
    { name: 'href-app-products', resolve: (p) => p.locator('a[href*="/app/products"]').first() },
  ];
}

export function navLinkStrategies(label: string): LocatorStrategy[] {
  const re = new RegExp(`^${label}$`, 'i');
  return [
    { name: `role-link-${label}`, resolve: (p) => p.getByRole('link', { name: re }) },
    { name: `href-contains-${label}`, resolve: (p) => p.getByRole('link').filter({ hasText: re }).first() },
  ];
}

export function signOutStrategies(): LocatorStrategy[] {
  return [
    { name: 'role-button-Sign-out', resolve: (p) => p.getByRole('button', { name: /sign out/i }) },
    { name: 'text-Sign-out', resolve: (p) => p.getByText(/sign out/i).first() },
  ];
}

export function continueShoppingStrategies(): LocatorStrategy[] {
  return [
    { name: 'role-link-Continue-shopping', resolve: (p) => p.getByRole('link', { name: /continue shopping/i }) },
    { name: 'text-Continue', resolve: (p) => p.getByText(/continue shopping/i).first() },
  ];
}

export function novaRetailHeadingStrategies(): LocatorStrategy[] {
  return [
    { name: 'text-Nova-Retail', resolve: (p) => p.getByText(/nova retail/i).first() },
    { name: 'heading-Nova', resolve: (p) => p.getByRole('heading').filter({ hasText: /nova/i }).first() },
  ];
}

export function productsHeadingStrategies(): LocatorStrategy[] {
  return [
    { name: 'heading-Products', resolve: (p) => p.getByRole('heading', { name: /products|catalog/i }) },
    { name: 'text-Storefront', resolve: (p) => p.getByText('Storefront').first() },
  ];
}

export function primaryNavStrategies(): LocatorStrategy[] {
  return [{ name: 'nav-primary', resolve: (p) => p.getByRole('navigation', { name: /primary/i }) }];
}

export function shippingCheckoutHeadingStrategies(): LocatorStrategy[] {
  return [{ name: 'text-shipping-checkout', resolve: (p) => p.getByText(/shipping|checkout/i).first() }];
}

export function confirmedOrderStrategies(): LocatorStrategy[] {
  return [
    { name: 'text-confirmed', resolve: (p) => p.getByText(/confirmed/i).first() },
    { name: 'rw-success', resolve: (p) => p.locator('.rw-success').first() },
  ];
}
