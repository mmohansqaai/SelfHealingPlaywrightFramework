/**
 * Generates docs/Self-Healing-Playwright-Framework-Board-Deck.pptx
 * Run: node scripts/generate-board-deck.mjs
 */
import pptxgen from 'pptxgenjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'docs', 'Self-Healing-Playwright-Framework-Board-Deck.pptx');

const COLORS = {
  primary: '1a365d',
  accent: '2b6cb0',
  text: '2d3748',
  muted: '718096',
};

function titleSlide(pptx, title, subtitle) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.primary };
  slide.addText(title, {
    x: 0.5,
    y: 2.2,
    w: 9,
    h: 1.2,
    fontSize: 32,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Arial',
  });
  slide.addText(subtitle, {
    x: 0.5,
    y: 3.6,
    w: 9,
    h: 0.8,
    fontSize: 16,
    color: 'E2E8F0',
    fontFace: 'Arial',
  });
  slide.addText('Confidential — Internal / Board use', {
    x: 0.5,
    y: 5.1,
    w: 9,
    h: 0.4,
    fontSize: 10,
    color: 'A0AEC0',
    fontFace: 'Arial',
  });
  return slide;
}

function sectionSlide(pptx, title) {
  const slide = pptx.addSlide();
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.35,
    fill: { color: COLORS.accent },
    line: { color: COLORS.accent, width: 0 },
  });
  slide.addText(title, {
    x: 0.5,
    y: 0.55,
    w: 9,
    h: 0.7,
    fontSize: 24,
    bold: true,
    color: COLORS.primary,
    fontFace: 'Arial',
  });
  return slide;
}

function bulletSlide(pptx, title, bullets, notes) {
  const slide = sectionSlide(pptx, title);
  slide.addText(bullets.map((b) => ({ text: b, options: { bullet: true } })), {
    x: 0.55,
    y: 1.45,
    w: 8.9,
    h: 4.5,
    fontSize: 14,
    color: COLORS.text,
    fontFace: 'Arial',
    valign: 'top',
    lineSpacingMultiple: 1.25,
  });
  if (notes) {
    slide.addNotes(notes);
  }
  return slide;
}

async function main() {
  const pptx = new pptxgen();
  pptx.author = 'Engineering';
  pptx.title = 'Self-Healing Playwright Automation Framework';
  pptx.subject = 'Board overview';
  pptx.layout = 'LAYOUT_WIDE';

  titleSlide(
    pptx,
    'Self-Healing Playwright\nAutomation Framework',
    'Resilient UI tests • Faster feedback • Lower maintenance'
  );

  bulletSlide(
    pptx,
    'Executive summary',
    [
      'Playwright-based test automation with multi-strategy “self-healing” locators.',
      'When the UI changes slightly (labels, roles, structure), tests try ordered fallback selectors before failing.',
      'Healing attempts are recorded in HTML reports for transparency and tuning.',
      'Nova Retail demo app: ~80+ executable traceability scenarios with shared healing utilities.',
      'CI-ready: headless Chromium, retries, HTML + JSON reporters, GitHub Actions.',
    ],
    'Emphasize business outcome: less brittle automation, clearer failure diagnostics.'
  );

  bulletSlide(
    pptx,
    'Why traditional E2E tests break',
    [
      'Single brittle selector per action (one DOM change → red build).',
      'High cost to maintain selectors across releases and A/B tests.',
      'Failures often obscure whether the bug is product vs. test.',
      'Board takeaway: we are investing in durability, not only coverage.',
    ]
  );

  bulletSlide(
    pptx,
    'What “self-healing” means here',
    [
      'Ordered list of locator strategies per action (e.g. role → placeholder → CSS).',
      'First strategy that succeeds wins; result includes which strategy was used.',
      'If all strategies fail, error summarizes every attempt (debuggable).',
      'Not ML-based: predictable, auditable, suitable for regulated contexts.',
    ]
  );

  bulletSlide(
    pptx,
    'Architecture (high level)',
    [
      'core/self-healing — clickHealing, fillHealing, expectVisibleHealing, withHealingPage.',
      'core/healing-types — LocatorStrategy, HealingResult, per-strategy attempts.',
      'core/healing-reporter — attachHealingSummary → artifacts in Playwright HTML report.',
      'pages/ — LoginPage, RetailJourneyPage, AdminInventoryPage with strategy chains.',
      'tests/traceability — Nova Retail journeys using shared strategies.ts fallbacks.',
    ]
  );

  bulletSlide(
    pptx,
    'Reporting & governance',
    [
      'Each healing action can attach “Used strategy: X” plus pass/fail per strategy.',
      'Stakeholders see whether a test passed on primary vs. fallback selector.',
      'Supports data-driven cleanup: retire dead strategies, add new ones after refactors.',
    ]
  );

  bulletSlide(
    pptx,
    'Automation scope (example)',
    [
      'Smoke: login, products, cart, checkout, admin flows (existing specs).',
      'Traceability: site access, search/PLP, PDP, cart, checkout, responsive, a11y/perf, security/SEO.',
      'Configurable base URL (e.g. staging) via BASE_URL / playwright.config.',
    ]
  );

  bulletSlide(
    pptx,
    'CI / quality gates',
    [
      'Playwright: parallel execution, trace/screenshot/video on retry.',
      'Reporters: list, HTML, JSON (integration-friendly).',
      'GitHub Actions workflow for automated runs on push/PR.',
      'Optional: system Chrome for local runs (PW_USE_SYSTEM_CHROME).',
    ]
  );

  bulletSlide(
    pptx,
    'Business outcomes',
    [
      'Lower mean time to repair for automation after UI tweaks.',
      'Fewer false negatives; clearer attribution (product vs. selector).',
      'Faster release confidence when paired with staging and PR checks.',
      'Reusable pattern for additional apps: same core, new page strategies.',
    ]
  );

  bulletSlide(
    pptx,
    'Recommended next steps',
    [
      'Add Firefox/WebKit projects for cross-browser governance where required.',
      'Optional: axe-core for accessibility gates; CDP for network-fault scenarios.',
      'Dashboard: consume JSON results for trend charts (script hooks already present).',
      'Train squads on strategy ordering conventions and report review.',
    ]
  );

  const closing = pptx.addSlide();
  closing.background = { color: COLORS.primary };
  closing.addText('Questions?', {
    x: 0.5,
    y: 2.4,
    w: 9,
    h: 1,
    fontSize: 36,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Arial',
    align: 'center',
  });
  closing.addText('Self-Healing Playwright Framework • Engineering', {
    x: 0.5,
    y: 3.5,
    w: 9,
    h: 0.5,
    fontSize: 14,
    color: 'CBD5E0',
    fontFace: 'Arial',
    align: 'center',
  });

  await pptx.writeFile({ fileName: outPath });
  console.log('Wrote:', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
