import type { Page } from '@playwright/test';
import { clickHealing, expectVisibleHealing, fillHealing } from '../core/self-healing';
import type { HealingResult, LocatorStrategy } from '../core/healing-types';

const loginPath = '/login';

export class LoginPage {
  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(loginPath);
  }

  private emailStrategies(): LocatorStrategy[] {
    return [
      {
        name: 'getByLabel-Email',
        resolve: (p) => p.getByLabel(/email/i),
      },
      {
        name: 'placeholder-email',
        resolve: (p) => p.locator('input[type="email"], input[name*="email" i], input[id*="email" i]').first(),
      },
      {
        name: 'role-textbox-first',
        resolve: (p) => p.getByRole('textbox').first(),
      },
    ];
  }

  private passwordStrategies(): LocatorStrategy[] {
    return [
      {
        name: 'getByLabel-Password',
        resolve: (p) => p.getByLabel(/password/i),
      },
      {
        name: 'input-password',
        resolve: (p) => p.locator('input[type="password"]').first(),
      },
    ];
  }

  private submitStrategies(): LocatorStrategy[] {
    return [
      {
        name: 'role-button-Sign-in',
        resolve: (p) => p.getByRole('button', { name: /sign in/i }),
      },
      {
        name: 'submit-type',
        resolve: (p) => p.locator('button[type="submit"], input[type="submit"]').first(),
      },
      {
        name: 'text-Sign-in',
        resolve: (p) => p.getByText(/^sign in$/i).first(),
      },
    ];
  }

  private headingStrategies(): LocatorStrategy[] {
    return [
      {
        name: 'heading-sign-in-workspace',
        resolve: (p) => p.getByRole('heading', { name: /sign in to your workspace/i }),
      },
      {
        name: 'text-sign-in-workspace',
        resolve: (p) => p.getByText(/sign in to your workspace/i).first(),
      },
      {
        name: 'text-Nova-Retail',
        resolve: (p) => p.getByText('Nova Retail').first(),
      },
    ];
  }

  async expectLoaded(): Promise<HealingResult<void>> {
    return expectVisibleHealing(this.page, this.headingStrategies());
  }

  async fillEmail(value: string): Promise<HealingResult<void>> {
    return fillHealing(this.page, this.emailStrategies(), value);
  }

  async fillPassword(value: string): Promise<HealingResult<void>> {
    return fillHealing(this.page, this.passwordStrategies(), value);
  }

  async submit(): Promise<HealingResult<void>> {
    return clickHealing(this.page, this.submitStrategies());
  }

  async loginAsCustomer(): Promise<{
    email: HealingResult<void>;
    password: HealingResult<void>;
    submit: HealingResult<void>;
  }> {
    const email = await this.fillEmail('test@demo.com');
    const password = await this.fillPassword('password123');
    const submit = await this.submit();
    return { email, password, submit };
  }
}
