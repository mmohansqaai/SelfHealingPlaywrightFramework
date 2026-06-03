/**
 * Technical presentation: stack, architecture, 3 healing strategies, dashboard.
 * Output: docs/Self-Healing-Technical-Presentation.pptx
 * Speaker notes: docs/Self-Healing-Technical-Presentation-Speaker-Notes.md
 */
import pptxgen from 'pptxgenjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'docs', 'Self-Healing-Technical-Presentation.pptx');

const C = {
  navy: '1b365d',
  blue: '2f6fb0',
  teal: '0d9488',
  green: '059669',
  purple: '7c3aed',
  text: '2d3748',
  muted: '718096',
  bg: 'f7fafc',
};

function titleSlide(pptx, title, subtitle) {
  const s = pptx.addSlide();
  s.background = { color: C.navy };
  s.addText(title, {
    x: 0.6, y: 1.55, w: 12.0, h: 1.2,
    fontFace: 'Arial', fontSize: 30, bold: true, color: 'FFFFFF',
  });
  s.addText(subtitle, {
    x: 0.6, y: 2.95, w: 12.0, h: 1.0,
    fontFace: 'Arial', fontSize: 15, color: 'DCE6F2',
  });
  s.addText('Nova Retail • Self-Healing Playwright Framework • Technical Briefing', {
    x: 0.6, y: 5.0, w: 12.0, h: 0.35,
    fontFace: 'Arial', fontSize: 11, color: 'AFC1D9',
  });
}

function slide(pptx, title, bullets = [], footer = '') {
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 0.28,
    fill: { color: C.blue }, line: { width: 0 },
  });
  s.addText(title, {
    x: 0.6, y: 0.45, w: 12.0, h: 0.6,
    fontFace: 'Arial', fontSize: 21, bold: true, color: C.navy,
  });
  if (bullets.length) {
    s.addText(bullets.map((b) => ({ text: b, options: { bullet: true } })), {
      x: 0.7, y: 1.2, w: 12.0, h: 4.1,
      fontFace: 'Arial', fontSize: 13, color: C.text, lineSpacingMultiple: 1.16,
    });
  }
  if (footer) {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.7, y: 5.1, w: 12.0, h: 0.78,
      fill: { color: C.bg }, line: { color: 'D9E2EC', width: 1 },
    });
    s.addText(footer, {
      x: 0.95, y: 5.28, w: 11.5, h: 0.42,
      fontFace: 'Arial', fontSize: 10, bold: true, color: C.muted, align: 'center',
    });
  }
  return s;
}

function twoColumnSlide(pptx, title, leftTitle, leftItems, rightTitle, rightItems, footer = '') {
  const s = slide(pptx, title, []);
  const col = (x, label, items, color) => {
    s.addText(label, {
      x, y: 1.1, w: 5.9, h: 0.35,
      fontFace: 'Arial', fontSize: 12, bold: true, color: color || C.teal,
    });
    s.addText(items.map((t) => ({ text: t, options: { bullet: true } })), {
      x, y: 1.48, w: 5.9, h: 3.5,
      fontFace: 'Arial', fontSize: 12, color: C.text, lineSpacingMultiple: 1.12,
    });
  };
  col(0.7, leftTitle, leftItems);
  col(6.75, rightTitle, rightItems);
  if (footer) {
    s.addText(footer, {
      x: 0.7, y: 5.2, w: 12.0, h: 0.4,
      fontFace: 'Arial', fontSize: 10, italic: true, color: C.muted, align: 'center',
    });
  }
}

function flowSlide(pptx, title, lines) {
  const s = slide(pptx, title, []);
  s.addText(lines.join('\n'), {
    x: 0.85, y: 1.15, w: 11.8, h: 4.2,
    fontFace: 'Courier New', fontSize: 11, color: C.text,
    lineSpacingMultiple: 1.2,
  });
}

async function main() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = 'Self-Healing Playwright — Technical Presentation';
  pptx.author = 'Quality Engineering';

  titleSlide(
    pptx,
    'Self-Healing Playwright Framework',
    'Technology stack • Architecture • Three healing strategies • Real-Time Testing Dashboard integration'
  );

  slide(pptx, 'Agenda', [
    'Technology stack and runtime environment',
    'Framework architecture and design principles',
    'Healing Strategy 1: Static ordered fallbacks',
    'Healing Strategy 2: Seed-rule discovery',
    'Healing Strategy 3: DOM scan discovery',
    'How strategies compose in the engine',
    'CI, Playwright reporting, and dashboard ingest',
    'Governance: avoiding false positives',
    'Live demos and how to run them',
  ]);

  twoColumnSlide(
    pptx,
    'Technology Stack',
    'Application & Automation',
    [
      'Application under test: Nova Retail (Vercel-hosted SPA)',
      'BASE_URL: retail-website-fawn.vercel.app (configurable)',
      'Playwright Test ^1.51 + TypeScript ^5.7',
      'Browser: Chromium (CI installs with OS deps)',
      'Page Object Model for login, retail journey, admin',
    ],
    'Platform & Observability',
    [
      'Source control & CI: GitHub Actions (ubuntu-latest)',
      'Reporters: list + HTML + JSON (results.json)',
      'Artifacts: HTML report, videos, traces (zipped for upload)',
      'Dashboard API: Render (realtime-testing-dashboard-api)',
      'Dashboard UI: Vercel (companion front-end)',
    ],
    'Node 20+ • npm ci • Playwright config in playwright.config.ts'
  );

  slide(pptx, 'High-Level Architecture', [
    'Tests (specs) call Page Objects → Page Objects call healing helpers (clickHealing, fillHealing).',
    'Healing engine (withHealingPage) tries static strategies, then optional auto-discovery.',
    'Discovery layer is pluggable: seed rules + DOM scan, composed and de-duplicated by score.',
    'Results attach to Playwright HTML report; JSON report feeds the Real-Time Testing Dashboard.',
  ], 'Separation: test intent in specs, locators in page objects, healing policy in core/.');

  flowSlide(pptx, 'Request Flow (One UI Action)', [
    '  Test spec',
    '      ↓',
    '  Page object (e.g. RetailJourneyPage.addFirstProductToCart)',
    '      ↓',
    '  clickHealing / fillHealing / expectVisibleHealing',
    '      ↓',
    '  withHealingPage',
    '      ├─ Try Strategy 1: static LocatorStrategy[] in order',
    '      ├─ If all fail & autoHeal enabled:',
    '      │     composeDiscoveryStrategies([seed, dom-scan])',
    '      │     score + validate count() on live page',
    '      └─ Return HealingResult (usedStrategy, attempts, autoHeal metadata)',
    '      ↓',
    '  attachHealingSummary / attachLiveAutoHealProof → HTML report',
    '      ↓',
    '  CI: results.json → payload.json + report.zip → Dashboard API',
  ]);

  slide(pptx, 'Framework Design Principles', [
    'Ordered fallbacks first — predictable, reviewable, fast (human-authored locators).',
    'Auto-discovery second — only after static exhaustion; never replaces assertions.',
    'Pluggable discovery strategies — seed and dom-scan are separate modules under core/discovery/.',
    'Transparent evidence — every attempt logged; winning strategy visible in report and dashboard test name.',
    'discoverOnly by default in demos — healed locators are not auto-committed without governance.',
  ]);

  slide(pptx, 'Repository Structure (core/)', [
    'core/self-healing.ts — engine: withHealingPage, clickHealing, fillHealing',
    'core/healing-types.ts — LocatorStrategy, HealingResult, GeneratedLocatorCandidate',
    'core/locator-query.ts — resolve queries to Playwright locators',
    'core/discovery/seed-discovery.ts — Strategy 2 (hint-based seeds)',
    'core/discovery/dom-scan-discovery.ts — Strategy 3 (page inventory)',
    'core/discovery/compose-discoverers.ts — merge strategies, env configuration',
    'core/healing-reporter.ts — HTML report attachments',
    'core/auto-heal-persistence.ts — optional write-back to page objects (governed)',
  ]);

  slide(pptx, 'Strategy 1 — Static Healing (Ordered Fallbacks)', [
    'Definition: predefined LocatorStrategy chain per element in page objects.',
    'Example: getByLabel(Email) → input[type=email] → getByRole(textbox).first()',
    'Execution: try strategy 1; on failure try 2, then 3; stop on first success.',
    'autoHeal.enabled: false — no automatic discovery (pure static).',
    'Showcase: @static-healing-showcase — broken decoy + static chain on Products page.',
    'Best for: stable screens, CI regression, critical flows where guessing is unacceptable.',
  ], 'Blue badge in demo: STATIC HEALING');

  slide(pptx, 'Strategy 2 — Seed-Rule Discovery', [
    'Triggers after all static strategies fail (autoHeal.enabled: true).',
    'Reads failure hints from attempt names/errors: email, password, add to cart, checkout, pay.',
    'Generates candidate locators (role + name, targeted CSS) and validates with locator.count().',
    'Scores: baseScore + uniqueness (count===1) + history from .self-healing-history.json',
    'Showcase: @auto-heal-discovery-showcase — discoveryStrategies: [seed] only.',
    'Fast, targeted — does not walk the entire DOM.',
  ], 'Purple badge: DYNAMIC HEALING (SEED RULES)');

  slide(pptx, 'Strategy 3 — DOM Scan Discovery', [
    'In-browser inventory of visible controls (buttons, inputs, headings) — up to 80 elements.',
    'Builds locators from testid, id, role+accessible name, name/placeholder attributes.',
    'Intent boost when labels match failure hints (e.g. Add to cart).',
    'Live validation: count(), uniqueness bonus, history; candidates named domscan-*',
    'Showcase: @dom-scan-healing-showcase — discoveryStrategies: [dom-scan] only.',
    'Best when: UI refactored, hints weak, seed rules insufficient.',
  ], 'Green badge: DOM SCAN HEALING (FULL PAGE INVENTORY)');

  twoColumnSlide(
    pptx,
    'How the Three Strategies Interact',
    'Runtime order (always)',
    [
      '1. Static chain (page object) — always runs first',
      '2. Seed discovery — if autoHeal on & configured',
      '3. DOM scan — if enabled (default with seed)',
      'Composer keeps highest score per unique query key',
    ],
    'Configuration',
    [
      'Per test: autoHeal.discoveryStrategies: [seed] | [dom-scan] | [seed, dom-scan]',
      'Env: AUTO_HEAL_STRATEGIES=seed,dom-scan',
      'Env: AUTO_HEAL_DOM_SCAN=0 → seed only',
      'Env: AUTO_HEAL_DISCOVER=1 → enable auto-heal globally',
      'CI showcases run one strategy each for clear demos',
    ],
    'Default production auto-heal: seed + dom-scan unless DOM scan disabled'
  );

  slide(pptx, 'Page Object Pattern', [
    'LoginPage, RetailJourneyPage, AdminInventoryPage encapsulate strategy methods.',
    'Each action returns HealingResult<T> — usedStrategy + attempts for reporting.',
    'source metadata (filePath, methodName, actionKey) enables optional persistence target.',
    'Journey methods chain steps: login → products → cart → checkout → confirm.',
    'Tests stay readable; healing complexity hidden behind PO methods.',
  ]);

  slide(pptx, 'Demonstration Tests (Beyond Login)', [
    'All three showcases: silent customer login, then demo on /app/products with on-screen toasts.',
    '@static-healing-showcase — broken data-demo-static-miss-add + static chain',
    '@auto-heal-discovery-showcase — broken data-demo-miss-add + seed only',
    '@dom-scan-healing-showcase — broken data-demo-domscan-miss-add + DOM scan only',
    'npm run test:healing-showcases — runs all three in CI',
    'Headed video: npm run test:dom-scan-healing-showcase -- --headed',
  ]);

  twoColumnSlide(
    pptx,
    'CI Pipeline (GitHub Actions)',
    'Test execution',
    [
      'npm ci → playwright install chromium',
      'Grep: @static-healing-showcase | @auto-heal-discovery-showcase | @dom-scan-healing-showcase',
      'video: on • json → playwright-report/results.json',
      'Upload HTML report + zipped test-results artifacts',
    ],
    'Dashboard publish (always step)',
    [
      'Warm Render API: GET /api/health',
      'build-dashboard-payload.mjs → payload.json',
      'Zip playwright-report → report.zip',
      'POST /api/ingest/github-actions/run-with-report (multipart)',
      'Header: X-Ingest-Token (GitHub secret)',
      'Non-blocking: ingest failure does not fail CI job',
    ]
  );

  flowSlide(pptx, 'Dashboard Ingest Data Flow', [
    '  Playwright run completes',
    '      ↓',
    '  playwright-report/results.json  +  index.html (+ traces in zip)',
    '      ↓',
    '  scripts/build-dashboard-payload.mjs',
    '      → { suite_name, environment, build_version, test_cases[] }',
    '      ↓',
    '  curl multipart POST',
    '      • payload=@payload.json',
    '      • report_zip=@report.zip',
    '      ↓',
    '  Dashboard API stores run + optional embedded HTML report',
    '      ↓',
    '  GET /api/summary → latest_runs (pass/fail, duration, has_html_report_zip)',
  ]);

  twoColumnSlide(
    pptx,
    'What the Dashboard Shows vs Playwright Report',
    'Real-Time Testing Dashboard',
    [
      'Suite name: SelfHealing Playwright',
      'Environment: CI • Build: git SHA',
      'Per-test: name, module, PASSED/FAILED/SKIPPED, duration_ms',
      'Trends across builds for leadership / QA metrics',
      'Embedded HTML report when zip ingest succeeds',
    ],
    'Playwright HTML Report (detail)',
    [
      'Step-by-step trace, video, screenshots',
      'Attachments: *-healing text (usedStrategy, all attempts)',
      'auto-heal-live-proof for showcase tests',
      'Auto-heal candidates, scores, reasons, query JSON',
      'Best for engineers debugging which locator healed',
    ],
    'Dashboard = portfolio view • Playwright = forensic view'
  );

  slide(pptx, 'Healing Metadata in Reports', [
    'formatHealingBody(): Used strategy, ✓/✗ per attempt, autoHeal block.',
    'Shows usedAutoGenerated, selectedCandidate (strategyName, score, reason).',
    'Lists top candidates with query type (role/css) for audit.',
    'persisted= path when AUTO_HEAL_PERSIST enabled and confidence threshold met.',
    'Demo toasts on page mirror report narrative for stakeholder videos.',
  ]);

  slide(pptx, 'Governance — Reducing False Positives', [
    'Heal is not a substitute for assertions — tests still expect URL, headings, order confirmed.',
    'Prefer static chains on critical paths; auto-heal as safety net in staging.',
    'discoverOnly in showcases — no silent code changes during demos.',
    'Uniqueness gate: candidates need count >= 1; prefer count === 1 for higher score.',
    'Roadmap: post-action healVerify, ambiguity rejection, scoped DOM scan to main content.',
    'Monthly review of tests that frequently use autogenerated strategies.',
  ]);

  slide(pptx, 'When to Use Which Strategy (Decision Guide)', [
    'Static only — production CI smoke, compliance flows, known stable UI.',
    'Static + seed — label/role drift on familiar pages (login, cart, checkout).',
    'Static + seed + DOM scan — staging/nightly, refactored UI, exploratory coverage.',
    'DOM scan only (demo) — prove full-page inventory path in isolation.',
    'Disable AUTO_HEAL_DOM_SCAN=0 in CI if scan time or ambiguity risk is a concern.',
  ]);

  slide(pptx, 'Commands & Environment Variables', [
    'npm run test:healing-showcases — all three strategy demos',
    'npm run test:static-healing-showcase | test:auto-heal-discovery-showcase | test:dom-scan-healing-showcase',
    'npm run deck:technical — regenerate this PowerPoint',
    'AUTO_HEAL_DISCOVER=1 • AUTO_HEAL_DOM_SCAN=0|1 • AUTO_HEAL_STRATEGIES=seed,dom-scan',
    'DASHBOARD_URL • DASHBOARD_INGEST_TOKEN • SUITE_NAME • ENVIRONMENT • BUILD_VERSION',
    'Docs: docs/dashboard-ingest.md • Speaker notes: docs/Self-Healing-Technical-Presentation-Speaker-Notes.md',
  ]);

  slide(pptx, 'Roadmap & Closing', [
    'Stabilize dashboard API hosting (memory, cold start).',
    'Flow-level recovery checkpoints (authenticate, cart has items).',
    'healVerify callbacks after healed actions.',
    'Dashboard widgets: auto-healed step ratio per suite.',
    'Controlled persistence with PR review for high-confidence locators.',
  ], 'Questions? Run live demo: npm run test:healing-showcases -- --headed');

  const end = pptx.addSlide();
  end.background = { color: C.navy };
  end.addText('Thank You', {
    x: 0.6, y: 2.0, w: 12.0, h: 0.9,
    fontFace: 'Arial', fontSize: 34, bold: true, color: 'FFFFFF', align: 'center',
  });
  end.addText('Self-Healing Playwright Framework • Technical Presentation', {
    x: 0.6, y: 3.05, w: 12.0, h: 0.5,
    fontFace: 'Arial', fontSize: 14, color: 'CBD5E0', align: 'center',
  });
  end.addText('Generate: npm run deck:technical', {
    x: 0.6, y: 4.2, w: 12.0, h: 0.4,
    fontFace: 'Arial', fontSize: 11, color: 'AFC1D9', align: 'center',
  });

  await pptx.writeFile({ fileName: outPath });
  console.log('Wrote:', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
