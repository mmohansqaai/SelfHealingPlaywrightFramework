/**
 * Project Manager presentation deck (low technical depth).
 * Output: docs/Self-Healing-PM-Presentation.pptx
 */
import pptxgen from 'pptxgenjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'docs', 'Self-Healing-PM-Presentation.pptx');

const C = {
  navy: '1b365d',
  blue: '2f6fb0',
  teal: '0d9488',
  text: '2d3748',
  muted: '718096',
  bg: 'f7fafc',
  warn: 'c05621',
};

function titleSlide(pptx, title, subtitle) {
  const s = pptx.addSlide();
  s.background = { color: C.navy };
  s.addText(title, {
    x: 0.6, y: 1.75, w: 12.0, h: 1.3,
    fontFace: 'Arial', fontSize: 32, bold: true, color: 'FFFFFF',
  });
  s.addText(subtitle, {
    x: 0.6, y: 3.2, w: 12.0, h: 0.9,
    fontFace: 'Arial', fontSize: 16, color: 'DCE6F2',
  });
  s.addText('Project Manager Briefing • Nova Retail QA Program', {
    x: 0.6, y: 5.05, w: 12.0, h: 0.35,
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
    fontFace: 'Arial', fontSize: 22, bold: true, color: C.navy,
  });
  if (bullets.length) {
    s.addText(bullets.map((b) => ({ text: b, options: { bullet: true } })), {
      x: 0.7, y: 1.25, w: 12.0, h: 4.0,
      fontFace: 'Arial', fontSize: 14, color: C.text, lineSpacingMultiple: 1.18,
    });
  }
  if (footer) {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.7, y: 5.15, w: 12.0, h: 0.75,
      fill: { color: C.bg }, line: { color: 'D9E2EC', width: 1 },
    });
    s.addText(footer, {
      x: 0.95, y: 5.32, w: 11.5, h: 0.4,
      fontFace: 'Arial', fontSize: 11, bold: true, color: C.muted, align: 'center',
    });
  }
  return s;
}

function twoColumnSlide(pptx, title, leftTitle, leftItems, rightTitle, rightItems) {
  const s = slide(pptx, title, []);
  const col = (x, label, items) => {
    s.addText(label, {
      x, y: 1.15, w: 5.9, h: 0.35,
      fontFace: 'Arial', fontSize: 13, bold: true, color: C.teal,
    });
    s.addText(items.map((t) => ({ text: t, options: { bullet: true } })), {
      x, y: 1.55, w: 5.9, h: 3.8,
      fontFace: 'Arial', fontSize: 13, color: C.text, lineSpacingMultiple: 1.15,
    });
  };
  col(0.7, leftTitle, leftItems);
  col(6.75, rightTitle, rightItems);
}

async function main() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = 'Self-Healing Playwright Framework — PM Presentation';
  pptx.author = 'Quality Engineering Program';

  titleSlide(
    pptx,
    'Self-Healing Playwright Framework',
    'Project overview for program managers: scope, outcomes, delivery status, and next steps'
  );

  slide(pptx, 'Executive Summary (2 lines)', [
    'A Playwright-based automation layer that recovers from UI locator changes automatically, reducing false failures and maintenance churn.',
    'Integrated with CI reporting and a real-time quality dashboard so leadership can track stability, pass/fail trends, and release confidence.',
  ]);

  slide(pptx, 'Project Objective', [
    'Improve automation reliability when the application UI evolves (labels, selectors, layout).',
    'Keep customer-critical journeys continuously testable: login, product browse, cart, checkout, admin inventory.',
    'Provide transparent evidence of what failed and what was healed on each run.',
    'Enable faster release decisions with cleaner CI signals and observable quality metrics.',
  ], 'Success = fewer flaky failures, faster triage, stronger trust in automation.');

  slide(pptx, 'Problem Statement', [
    'Traditional UI tests break on minor DOM changes, creating noise in CI and delaying releases.',
    'Teams spend significant effort rewriting locators instead of validating business behavior.',
    'Leadership lacks consistent visibility into automation health across builds and environments.',
  ]);

  slide(pptx, 'Solution Overview (Non-Technical)', [
    'Each UI action uses an ordered list of locator strategies (primary + fallbacks).',
    'If all predefined strategies fail, the engine discovers a semantic replacement from the live page.',
    'Every step records which strategy worked; reports show broken vs healed locator details.',
    'A showcase E2E demo uses on-screen toasts: intent → broken step → healing outcome.',
  ]);

  twoColumnSlide(
    pptx,
    'Scope: In Scope vs Out of Scope',
    'In Scope',
    [
      'Nova Retail core user journeys (login, checkout, admin restock).',
      'Self-healing engine, page objects, HTML/JSON reporting.',
      'GitHub Actions CI pipeline and artifact publishing.',
      'Dashboard ingest integration (metrics + HTML report zip).',
      'Executive demo test with guided toast narrative.',
    ],
    'Out of Scope (Current Phase)',
    [
      'Full replacement of manual exploratory testing.',
      'Automatic code commit of healed locators in production demo mode.',
      'Multi-product rollout beyond configured base URL.',
      'Performance/load testing and security penetration testing.',
    ]
  );

  slide(pptx, 'Key Deliverables', [
    'Reusable self-healing core (`core/self-healing.ts`, discovery, reporting).',
    'Page objects with strategy chains for login, retail journey, and admin flows.',
    'Automated test suites (core + optional traceability matrix).',
    'CI workflow: test execution, artifacts, dashboard publish, resilient retry handling.',
    'PM/executive presentation assets (board, management, and PM decks).',
  ]);

  twoColumnSlide(
    pptx,
    'Stakeholders & Roles',
    'Primary Stakeholders',
    [
      'Product / Program Management — release readiness decisions.',
      'QA / Automation Engineering — framework ownership and maintenance.',
      'DevOps / Platform — CI pipeline and hosting reliability.',
      'Leadership — quality KPIs and investment prioritization.',
    ],
    'Delivery Ownership',
    [
      'Framework design & test coverage: QA Engineering.',
      'Application under test: Nova Retail product team.',
      'CI execution: GitHub Actions (repo workflow).',
      'Observability API/UI: Real-Time Testing Dashboard (Render + Vercel).',
    ]
  );

  slide(pptx, 'Delivery Phases', [
    'Phase 1 — Foundation: healing engine, login/checkout flows, local + CI execution.',
    'Phase 2 — Observability: HTML report attachments, dashboard ingest, artifact packaging.',
    'Phase 3 — Demonstration: single E2E showcase with executive toasts and healing proof.',
    'Phase 4 — Scale (planned): broader traceability adoption and cross-team rollout.',
  ], 'Current status: Phases 1–3 delivered; Phase 4 in planning.');

  slide(pptx, 'Demo Flow (What PMs Will See)', [
    'Toast 1 — Auto-heal intent: explains why resilience matters for release confidence.',
    'Toast 2 — Broken step detected: shows the intentional broken locator and failure context.',
    'Toast 3 — Healing details: shows healed locator/strategy and that the flow continued.',
    'Playwright report attachment `auto-heal-live-proof` captures full attempt history.',
  ], 'Showcase test tag: @self-healing-showcase (single E2E in CI).');

  twoColumnSlide(
    pptx,
    'KPIs & Reporting',
    'Quality KPIs',
    [
      'Test pass rate and failure trend by build.',
      'Count of auto-healed steps vs hard failures.',
      'CI stability (false failure reduction over time).',
      'Mean time to diagnose locator-related issues.',
    ],
    'Reporting Channels',
    [
      'Playwright HTML report (per-run evidence).',
      'GitHub Actions artifacts (report + videos/traces).',
      'Real-Time Testing Dashboard (suite, env, build, progress).',
      'Workflow logs with payload summary and ingest diagnostics.',
    ]
  );

  slide(pptx, 'Risks, Issues & Mitigations', [
    'Risk: Dashboard API cold starts / OOM on Render free tier → 502 and slow health checks.',
    'Mitigation: API warm-up in CI, non-blocking ingest, readiness polling, consider paid tier/memory upgrade.',
    'Risk: Large HTML report zip may stress API during ingest.',
    'Mitigation: payload-only fallback option, zip size limits, and staged ingest retries.',
    'Risk: Over-reliance on auto-heal may hide true product defects.',
    'Mitigation: transparent attempt logs, governance review of healed locators, periodic selector hardening.',
  ]);

  slide(pptx, 'Dependencies & Assumptions', [
    'Nova Retail app availability at configured BASE_URL.',
    'GitHub secret `DASHBOARD_INGEST_TOKEN` for dashboard publishing.',
    'Render API service health for dashboard data persistence.',
    'Playwright browser install in CI runners (Chromium with OS deps).',
    'Assumption: UI changes are incremental; healing covers locator drift, not broken business logic.',
  ]);

  slide(pptx, 'Roadmap (Next 90 Days)', [
    'Stabilize dashboard API hosting (memory tier, keep-warm health pings).',
    'Expand self-healing coverage to additional high-value modules.',
    'Add leadership dashboard widgets for healed-vs-broken ratio.',
    'Introduce governance checkpoint: monthly review of recurring auto-heal events.',
    'Optional: enable controlled persistence of high-confidence healed locators.',
  ]);

  slide(pptx, 'Decisions Needed from Program Leadership', [
    'Approve framework as standard pattern for UI automation resilience.',
    'Fund dashboard/API infrastructure upgrade to remove cold-start instability.',
    'Prioritize next modules for Phase 4 rollout (cart, checkout extensions, admin).',
    'Align on quality KPI targets for quarterly reporting.',
  ], 'Ask: endorse scale-up as a program capability, not a one-off pilot.');

  const end = pptx.addSlide();
  end.background = { color: C.navy };
  end.addText('Thank You', {
    x: 0.6, y: 2.0, w: 12.0, h: 0.9,
    fontFace: 'Arial', fontSize: 36, bold: true, color: 'FFFFFF', align: 'center',
  });
  end.addText('Self-Healing Playwright Framework • PM Presentation', {
    x: 0.6, y: 3.1, w: 12.0, h: 0.5,
    fontFace: 'Arial', fontSize: 14, color: 'CBD5E0', align: 'center',
  });
  end.addText('Generate latest deck: npm run deck:pm', {
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
