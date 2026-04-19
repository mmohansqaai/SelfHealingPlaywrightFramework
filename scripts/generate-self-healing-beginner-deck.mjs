/**
 * Beginner-friendly technical deck: Self-Healing Playwright Framework from scratch.
 * Run: node scripts/generate-self-healing-beginner-deck.mjs
 * Output: docs/Self-Healing-Capabilities-Beginner-Deck.pptx
 */
import pptxgen from 'pptxgenjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'docs', 'Self-Healing-Capabilities-Beginner-Deck.pptx');

const C = {
  primary: '2c5282',
  accent: '3182ce',
  text: '2d3748',
  lightBg: 'f7fafc',
};

function titleSlide(pptx, title, subtitle) {
  const s = pptx.addSlide();
  s.background = { color: C.primary };
  s.addText(title, {
    x: 0.5,
    y: 1.8,
    w: 9,
    h: 1.4,
    fontSize: 28,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Arial',
  });
  s.addText(subtitle, {
    x: 0.5,
    y: 3.35,
    w: 9,
    h: 0.9,
    fontSize: 15,
    color: 'E2E8F0',
    fontFace: 'Arial',
  });
  s.addText('Technical walkthrough • No prior Playwright experience required', {
    x: 0.5,
    y: 4.85,
    w: 9,
    h: 0.45,
    fontSize: 11,
    color: 'A0AEC0',
    fontFace: 'Arial',
  });
  return s;
}

function headerSlide(pptx, title) {
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.32,
    fill: { color: C.accent },
    line: { width: 0 },
  });
  s.addText(title, {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.65,
    fontSize: 22,
    bold: true,
    color: C.primary,
    fontFace: 'Arial',
  });
  return s;
}

function bullets(s, items, yStart = 1.35) {
  s.addText(
    items.map((t) => ({ text: t, options: { bullet: true, color: C.text } })),
    {
      x: 0.55,
      y: yStart,
      w: 8.9,
      h: 4.6,
      fontSize: 13.5,
      fontFace: 'Arial',
      valign: 'top',
      lineSpacingMultiple: 1.22,
    }
  );
}

function codeSlide(pptx, title, lines) {
  const s = headerSlide(pptx, title);
  s.addText(lines.join('\n'), {
    x: 0.55,
    y: 1.35,
    w: 8.9,
    h: 4.2,
    fontSize: 11,
    fontFace: 'Courier New',
    color: '1a202c',
    fill: { color: C.lightBg },
    margin: 10,
    valign: 'top',
  });
  return s;
}

async function main() {
  const pptx = new pptxgen();
  pptx.title = 'Self-Healing Capabilities — Beginner Guide';
  pptx.layout = 'LAYOUT_WIDE';

  titleSlide(
    pptx,
    'How This Framework Supports Self-Healing\nBeginner technical walkthrough',
    'Learn self-healing capabilities from scratch with practical examples'
  );

  let s = headerSlide(pptx, 'What you will learn');
  bullets(s, [
    'What automated and end-to-end (E2E) tests are, in plain language.',
    'How Playwright drives a real browser to click and type like a user.',
    'What a locator is, and why a single locator often breaks after UI changes.',
    'How this project adds “self-healing”: multiple locator strategies per action.',
    'Where the code lives (folders) and how to run tests and open reports.',
  ]);

  s = headerSlide(pptx, '1. Manual vs automated testing');
  bullets(s, [
    'Manual: a human opens the app, clicks, and checks behavior each time.',
    'Automated: a script repeats those steps quickly and consistently.',
    'This repo uses automated tests so every code change can be checked the same way.',
  ]);

  s = headerSlide(pptx, '2. What is E2E (end-to-end) testing?');
  bullets(s, [
    'Tests the full stack as a user sees it: browser → your app → (often) server/API.',
    'Different from “unit tests” (one small function in isolation).',
    'E2E answers: “Can a real user complete login, add to cart, checkout?”',
  ]);

  s = headerSlide(pptx, '3. What is Playwright?');
  bullets(s, [
    'A tool from Microsoft that controls Chromium, Firefox, or WebKit.',
    'Your tests are TypeScript/JavaScript files that say: go to URL, click, fill, assert.',
    'This project uses @playwright/test — the test runner + assertions built in.',
  ]);

  s = headerSlide(pptx, '4. What is a locator?');
  bullets(s, [
    'A locator tells Playwright which element to use: e.g. “the Sign in button”.',
    'Examples: by visible text, by label (“Email”), by role (button, link), by CSS.',
    'If the developer changes the label or HTML, one fragile locator can fail.',
  ]);

  s = headerSlide(pptx, '5. Why do tests break after UI changes?');
  bullets(s, [
    'Classic pattern: one selector per button, e.g. only #login-btn.',
    'Design refresh renames id → test fails even if the app still works.',
    'Teams spend time fixing tests instead of finding real product bugs.',
  ]);

  s = headerSlide(pptx, '6. Self-healing in this framework (concept)');
  bullets(s, [
    'Instead of one selector, we define an ordered list of strategies.',
    'Playwright tries strategy A; if it fails, tries B, then C, until one works.',
    'If all fail, you get one clear error listing every attempt (easy to debug).',
    'This is rule-based fallback — not machine learning — so behavior is predictable.',
  ]);

  s = headerSlide(pptx, '7. Core building blocks in code');
  bullets(s, [
    'clickHealing(page, strategies) — click using the first strategy that succeeds.',
    'fillHealing(page, strategies, text) — type into an input with fallbacks.',
    'expectVisibleHealing(page, strategies) — wait until something is visible.',
    'withHealingPage — generic: run any action with the same try-order logic.',
  ]);

  codeSlide(pptx, '8. What a “strategy” looks like (idea)', [
    '// Each strategy has a name + how to find the element',
    '{ name: "getByLabel-Email",',
    '  resolve: (page) => page.getByLabel(/email/i) },',
    '{ name: "input-type-email",',
    '  resolve: (page) => page.locator(\'input[type="email"]\').first() },',
  ]);

  s = headerSlide(pptx, '9. Reporting: what actually worked?');
  bullets(s, [
    'attachHealingSummary (in healing-reporter.ts) adds text to the HTML report.',
    'You can see which strategy succeeded and which were skipped or failed.',
    'Helps you remove dead strategies and add new ones after a redesign.',
  ]);

  s = headerSlide(pptx, '10. Project folders (where to look)');
  bullets(s, [
    'core/ — self-healing helpers, types, reporter (reusable across apps).',
    'pages/ — page objects: LoginPage, RetailJourneyPage… each defines strategies.',
    'tests/ — spec files (*.spec.ts): login, checkout, admin, traceability.',
    'playwright.config.ts — base URL, timeouts, reporters, browser project (Chromium).',
  ]);

  s = headerSlide(pptx, '11. How to run tests (terminal)');
  bullets(s, [
    'npm install — install dependencies.',
    'npm run install:browsers — download Playwright browser (e.g. Chromium).',
    'npm test — run all tests headless (no visible window).',
    'npm run test:headed — same, but you see the browser.',
    'npm run test:traceability — only the Nova Retail traceability suite.',
    'npm run report — open the last HTML report after a run.',
  ]);

  s = headerSlide(pptx, '12. Fixtures (shared setup)');
  bullets(s, [
    'tests/fixtures.ts extends Playwright’s test with loginPage, retailJourney, etc.',
    'Tests can do: test("…", async ({ loginPage, page }) => { … })',
    'Page objects encapsulate healing so specs stay readable.',
  ]);

  s = headerSlide(pptx, '13. Glossary (quick reference)');
  bullets(s, [
    'Spec — a test file (*.spec.ts) containing one or more tests.',
    'Assertion — expect(…).toBeVisible() checks something is true.',
    'baseURL — default site under test (see playwright.config.ts, env BASE_URL).',
    'CI — Continuous Integration; GitHub Actions can run npm test on every push.',
  ]);

  s = headerSlide(pptx, '14. Suggested learning path');
  bullets(s, [
    'Read core/self-healing.ts (short) to see the try-each-strategy loop.',
    'Open pages/login.page.ts — real strategies for email, password, submit.',
    'Run npm run test:headed tests/login.spec.ts — watch one test pass.',
    'Open playwright-report after a run and find healing attachments.',
    'Then explore tests/traceability/ for broader flows.',
  ]);

  s = pptx.addSlide();
  s.background = { color: C.primary };
  s.addText('You’re ready to explore the repo', {
    x: 0.5,
    y: 2,
    w: 9,
    h: 0.9,
    fontSize: 26,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Arial',
    align: 'center',
  });
  s.addText(
    'Start with: README.md → core/self-healing.ts → pages/login.page.ts → npm run test:headed',
    {
      x: 0.7,
      y: 3.1,
      w: 8.6,
      h: 1.2,
      fontSize: 14,
      color: 'E2E8F0',
      fontFace: 'Arial',
      align: 'center',
    }
  );

  await pptx.writeFile({ fileName: outPath });
  console.log('Wrote:', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
