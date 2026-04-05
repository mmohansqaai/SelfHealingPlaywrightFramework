# Self-Healing Playwright Framework (Nova Retail)

[![Playwright Tests](https://github.com/mmohan-bayone/SelfHealingPlaywrightFramework/actions/workflows/playwright.yml/badge.svg)](https://github.com/mmohan-bayone/SelfHealingPlaywrightFramework/actions/workflows/playwright.yml)

Self-healing Playwright tests for the Nova Retail login page: `https://retail-website-two.vercel.app/login`.

## Purpose

- **Reduce flaky failures from locator changes** by trying multiple locator strategies (fallbacks) for the same element.
- **Keep tests readable** by hiding healing logic behind page objects.
- **Make debugging easy** by attaching healing details (winning strategy + failures) to the Playwright HTML report.

## How “healing” works (concept)

For each element (Email, Password, Sign in, etc.) we define an **ordered list** of strategies (locators).

When an action runs (fill/click/wait):

- Try strategy 1 → if it succeeds, stop.
- If it fails, try strategy 2 → then strategy 3, etc.
- If all fail, throw one error containing a summary of all failures.

Healing implementation lives in `core/self-healing.ts` and is used by page objects like `pages/login.page.ts`.

## Project structure

- **`core/`**
  - `self-healing.ts`: healing engine (`withHealingPage`) + helpers (`fillHealing`, `clickHealing`, `expectVisibleHealing`)
  - `healing-types.ts`: `LocatorStrategy`, `HealingResult`
  - `healing-reporter.ts`: attaches healing details to the HTML report
- **`pages/`**
  - `login.page.ts`: page object with locator strategy chains for the login page
  - `retail-journey.page.ts`: self-healing flow for products → cart → checkout → order confirmation
  - `admin-inventory.page.ts`: admin login destination `/app/admin`; per-row stock + Save; optional one-product seed if catalog is empty
- **`tests/`**
  - `fixtures.ts`: provides `loginPage`, `retailJourney`, and `adminInventory` fixtures
  - `login.spec.ts`: page-load + demo customer login
  - `checkout-flow.spec.ts`: end-to-end customer login through **complete checkout** (120s timeout)
  - `admin-restock.spec.ts`: **admin** login (`admin@demo.com` / `admin123`), seed product if DB empty, **+50 stock** per catalog row with healing
  - **`tests/traceability/`**: **Nova Retail–focused** TC matrix specs — **excluded from default runs** via `testIgnore` in `playwright.config.ts`. Run them with **`npm run test:traceability`** (sets `RUN_TRACEABILITY=1`) or `RUN_TRACEABILITY=1 npx playwright test`. Uses **`core/self-healing`**, **`strategies.ts`**, **`LoginPage`**, **`attachHealingSummary`**.
- **`.github/workflows/`**
  - `playwright.yml`: free GitHub Actions CI for running tests in headless Chromium

## Setup

### Prerequisites

- Node.js **20+**
- npm **9+** (comes with Node)

### Install dependencies

```bash
npm install
```

### Install Playwright browsers

```bash
npm run install:browsers
```

## Execute tests

### Run all tests (headless)

```bash
npm test
```

### Run in headed mode (visible browser)

```bash
npm run test:headed
```

### Run with Playwright UI mode

```bash
npm run test:ui
```

### Run a single spec file

```bash
npx playwright test tests/login.spec.ts
```

### Run a single test by title

```bash
npx playwright test -g "customer demo login"
```

### Run traceability suite (Nova Retail)

Not included in `npm test` by default. Use:

```bash
npm run test:traceability
```

(`RUN_TRACEABILITY=1` enables those specs.)

## Reports and artifacts

- **HTML report**: generated at `playwright-report/`
- **Test artifacts** (traces, screenshots, videos on retry): under `test-results/`

Open the report locally:

```bash
npm run report
```

## Demo credentials used in tests

The target login page displays demo users:

- **Customer**: `test@demo.com` / `password123`
- **Admin**: `admin@demo.com` / `admin123`

## Configuration

### Base URL

The Playwright config uses:

- default `BASE_URL`: `https://retail-website-two.vercel.app`
- override with:

```bash
BASE_URL="https://retail-website-two.vercel.app" npm test
```

### Use system Chrome (optional)

If you prefer using an installed Google Chrome instead of Playwright-downloaded Chromium:

```bash
PW_USE_SYSTEM_CHROME=1 npm test
```

## Free, open-source CI (GitHub Actions)

This repo includes a workflow that runs on **push** and **pull requests**:

- installs dependencies (`npm ci`)
- installs Playwright Chromium + OS deps (`npx playwright install --with-deps chromium`)
- runs tests (`npx playwright test`)
- uploads `playwright-report/` as an artifact; uploads `test-results/` (traces/screenshots) when **present**—on an all-green run this folder may not exist, so the workflow uses `if-no-files-found: ignore` for that artifact
- **Dashboard ingest:** set secret **`DASHBOARD_INGEST_TOKEN`**. After tests, CI runs **`node scripts/build-dashboard-payload.mjs`** → **`payload.json`**, zips **`playwright-report/`** → **`report.zip`**, then **`curl`** **`POST …/api/ingest/github-actions/run-with-report`** with **`-F "payload=@payload.json;type=application/json"`** and **`-F "report_zip=@report.zip;type=application/zip"`** (no JSON-only fallback). See **`docs/dashboard-ingest.md`**. **`continue-on-error: true`** on the publish step avoids blocking the job if the API is down. **Tests do not depend on the dashboard.**

If `curl` shows **0 bytes** or always times out, the Render (or other) URL is not responding in time—check the Render dashboard, logs, and that the service is not suspended; raising timeouts alone will not fix a dead URL.

Reporters are defined in `playwright.config.ts` (including JSON at `playwright-report/results.json`). **Do not** pass `--reporter=...` on the command line in CI unless you repeat the same `outputFile`, or that JSON file will not be created.

Workflow file: `.github/workflows/playwright.yml`

**Building the Real-Time Testing Dashboard API** (ingest contract, Render, GitHub): see [`docs/dashboard-ingest.md`](docs/dashboard-ingest.md).

