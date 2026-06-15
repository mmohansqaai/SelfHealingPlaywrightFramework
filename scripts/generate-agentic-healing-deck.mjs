/**
 * Technical presentation: Agentic Self-Healing Playwright Framework.
 * Output: docs/Agentic-Healing-Technical-Presentation.pptx
 * Speaker notes: docs/Agentic-Healing-Technical-Presentation-Speaker-Notes.md
 * Run: npm run deck:agentic
 */
import pptxgen from 'pptxgenjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'docs', 'Agentic-Healing-Technical-Presentation.pptx');

const C = {
  navy: '1b365d',
  blue: '2f6fb0',
  teal: '0d9488',
  green: '059669',
  purple: '7c3aed',
  orange: 'c05621',
  text: '2d3748',
  muted: '718096',
  bg: 'f7fafc',
  red: 'c53030',
};

function titleSlide(pptx, title, subtitle) {
  const s = pptx.addSlide();
  s.background = { color: C.navy };
  s.addText(title, {
    x: 0.6, y: 1.45, w: 12.0, h: 1.3,
    fontFace: 'Arial', fontSize: 30, bold: true, color: 'FFFFFF',
  });
  s.addText(subtitle, {
    x: 0.6, y: 2.9, w: 12.0, h: 1.1,
    fontFace: 'Arial', fontSize: 15, color: 'DCE6F2',
  });
  s.addText('Self-Healing Playwright Framework • Agentic Architecture • Plug-and-Play SDK', {
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
  col(0.7, leftTitle, leftItems, C.teal);
  col(6.75, rightTitle, rightItems, C.purple);
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

function tableSlide(pptx, title, headers, rows, footer = '') {
  const s = slide(pptx, title, []);
  const tableData = [
    headers.map((h) => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: C.navy } } })),
    ...rows.map((row, i) =>
      row.map((cell) => ({
        text: cell,
        options: { fill: { color: i % 2 === 0 ? 'FFFFFF' : C.bg } },
      }))
    ),
  ];
  s.addTable(tableData, {
    x: 0.6, y: 1.15, w: 12.1,
    fontFace: 'Arial', fontSize: 11, color: C.text,
    border: { type: 'solid', color: 'D9E2EC', pt: 1 },
    colW: [2.8, 4.6, 4.7],
  });
  if (footer) {
    s.addText(footer, {
      x: 0.7, y: 5.2, w: 12.0, h: 0.4,
      fontFace: 'Arial', fontSize: 10, italic: true, color: C.muted, align: 'center',
    });
  }
}

async function main() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = 'Agentic Self-Healing Playwright — Technical Presentation';
  pptx.author = 'Quality Engineering';

  titleSlide(
    pptx,
    'Agentic Self-Healing Playwright Framework',
    'Architecture • Agent loop • Autonomous QA (Phases 8–11) • Plug-and-play SDK'
  );

  slide(pptx, 'Agenda', [
    'Executive summary — what this framework does',
    'Agentic vs pure AI — honest technical positioning',
    'Architecture: SDK, healing-service, agent pool',
    'The agent loop: observe → reason → act → reflect',
    'Three adoption tiers (plug-and-play)',
    'LLM provider layer (mock, OpenAI, Anthropic)',
    'Components and repository map',
    'Configuration and environment variables',
    'Step-by-step: how to use in your project',
    'Governance, limitations, and roadmap',
    'Phases 8–11: fully autonomous QA (delivered)',
  ]);

  slide(pptx, 'Executive Summary', [
    'Playwright tests fail when UI locators change — this framework auto-recovers by trying alternative locators.',
    'Built as a plug-and-play npm package: ai-healing-sdk — any Playwright project can adopt it in minutes.',
    'Uses an agentic loop (observe, tool use, validate, reflect) — not a single-shot rule engine.',
    'Real LLM (OpenAI / Anthropic) is optional via healing-service sidecar — API keys never in tests.',
    'Default in-process path works without server or API key (heuristic agent tools).',
    'Nova Retail demo app validates login, cart, checkout, and admin flows with self-healing.',
  ], 'Product: ai-healing-sdk • Reference app: this monorepo • Optional gateway: healing-service');

  twoColumnSlide(
    pptx,
    'Is This Pure Agentic AI?',
    'What it IS',
    [
      'Agent loop with bounded iterations (default: 3)',
      'Tool use: search_dom, list_heuristic_candidates',
      'Reflect: failed candidates excluded on retry',
      'Optional real LLM on healing-service',
      'Full audit trail: agentTrace in API response',
      'Plug-and-play — progressive enhancement by config',
    ],
    'What it is NOT',
    [
      'Not always-on ChatGPT in every test run',
      'Not autonomous test generation or assertion repair',
      'Not vision/screenshot AI (v1 — DOM JSON only)',
      'In-process SDK default = heuristic-agent-v1 (no API call)',
      'Mock LLM re-ranks heuristics — not model inference',
      'Static locators still run first (by design)',
    ],
    'Honest label: Agentic architecture + optional LLM — not 100% LLM-driven'
  );

  tableSlide(
    pptx,
    'Agentic Maturity by Setup',
    ['Setup', 'What runs', 'Real LLM?'],
    [
      ['SDK only + AUTO_HEAL_DISCOVER=1', 'In-process agent loop + heuristic tools', 'No'],
      ['healing-service + HEALING_LLM_PROVIDER=mock', 'Agent loop via HTTP + mock LLM', 'No (simulated)'],
      ['healing-service + openai + API key', 'llm-locator-agent + OpenAI API', 'Yes'],
      ['healing-service + anthropic + API key', 'llm-locator-agent + Anthropic API', 'Yes'],
      ['HEALING_AGENT_MODE=legacy', 'Old single-shot discoverer (no loop)', 'No'],
    ],
    'Same test code across all tiers — only environment changes'
  );

  flowSlide(pptx, 'End-to-End Healing Flow', [
    '  Playwright test calls healable.click() or clickHealing()',
    '      ↓',
    '  Layer 1: Static LocatorStrategy[] (page object chains)',
    '      ├─ Success → stop (fast path, $0 cost)',
    '      └─ All fail → agent loop (if healingEnabled)',
    '      ↓',
    '  Agent loop (up to 3 iterations):',
    '      OBSERVE  → DOM snapshot + failure hints',
    '      REASON   → tools + optional LLM propose locators',
    '      ACT      → validate each candidate (count + action retry)',
    '      REFLECT  → append failures, next iteration',
    '      ↓',
    '  Success → history + optional persistence + HTML report attachment',
  ]);

  twoColumnSlide(
    pptx,
    'Monorepo Architecture',
    'Consumer-facing (plug-and-play)',
    [
      'packages/ai-healing-sdk — npm package',
      'enableHealing() + healable.click/fill',
      'clickHealing / fillHealing (page objects)',
      'Agent loop: packages/ai-healing-sdk/src/agent/',
      'examples/playwright-plug-and-play — external demo',
    ],
    'Platform (optional sidecar)',
    [
      'services/healing-service — POST /heal gateway',
      'agents/locator-agent — rule-based tool agent',
      'agents/llm-locator-agent — LLM proposals',
      'packages/llm-provider — OpenAI, Anthropic, mock',
      'Nova Retail pages/ + tests/ — reference implementation',
    ],
    'SDK is the product; monorepo is reference + agent hosting'
  );

  slide(pptx, 'The Agent Loop (Core Behavior)', [
    'Iteration cap: HEALING_AGENT_MAX_ITERATIONS (default 3) — no infinite loops.',
    'OBSERVE: buildHealingRequest() captures DOM snapshot, URL, action type, failure hints.',
    'REASON: runAgentEngine() or runLlmLocatorAgent() invokes tools then proposes candidates.',
    'ACT: SDK validates each candidate via locator.count() and retries the failed action.',
    'REFLECT: priorValidationResults sent on next iteration — failed locators excluded.',
    'COMMIT: recordHistoryOutcome(), optional persistGeneratedLocator(), attachHealingSummary().',
  ], 'Implemented in: agent-loop.ts • agent-engine.ts • llm-locator-agent.ts');

  slide(pptx, 'Agent Tools (Server & In-Process)', [
    'list_heuristic_candidates — runs seed rules + DOM scan synthesis offline or in-browser.',
    'search_dom — filters DOM snapshot by role, tag, text (intent from failure hints).',
    'score_candidate — confidence scoring merges tool outputs.',
    'Heuristic tools are deterministic — they feed context to LLM, not replace validation.',
    'LLM never executes arbitrary code — only returns structured Playwright locator JSON.',
    'Rule-based locator-agent remains as ensemble backup when LLM is enabled.',
  ]);

  twoColumnSlide(
    pptx,
    'LLM Provider Layer (llm-provider)',
    'Providers',
    [
      'mock — CI-safe; re-ranks heuristic candidates',
      'heuristic — skip LLM agent; locator-agent only',
      'openai — gpt-4o-mini default, JSON response',
      'anthropic — claude-3-5-haiku default',
      'Structured output: role + name or css only',
    ],
    'Service env (keys here only)',
    [
      'HEALING_LLM_PROVIDER=mock|openai|anthropic',
      'HEALING_LLM_API_KEY=...',
      'HEALING_LLM_MODEL=... (optional)',
      'HEALING_LLM_MAX_TOKENS=2000',
      'HEALING_LLM_TIMEOUT_MS=30000',
      'Never set API keys in Playwright test process',
    ],
    'Package: packages/llm-provider — zero dependency on Playwright'
  );

  flowSlide(pptx, 'Remote Healing Path (with LLM)', [
    '  Playwright test (ai-healing-sdk)',
    '      ↓  POST /heal + agentContext (iteration, prior failures)',
    '  healing-service',
    '      ↓  routeHealingRequest()',
    '  llm-locator-agent',
    '      ├─ tools: list_heuristic_candidates, search_dom',
    '      ├─ LLM: proposeLocators() → JSON candidates',
    '      └─ fallback: locator-agent on error',
    '      ↓',
    '  Merge candidates + agentTrace → HealingResponse',
    '      ↓',
    '  SDK validates in browser → reflect loop if needed',
  ]);

  slide(pptx, 'Plug-and-Play: Three Adoption Tiers', [
    'Tier 1 — SDK only: npm install ai-healing-sdk + enableHealing() + healable.* — no server.',
    'Tier 2 — Service rules: HEALING_SERVICE_URL + healing-service (HEALING_LLM_PROVIDER=heuristic).',
    'Tier 3 — Service + LLM: same SDK code + openai/anthropic on service with API key.',
    'Key principle: test code is identical across tiers — only environment variables change.',
    'Progressive enhancement: start Tier 1, add service when you need remote or real LLM.',
    'Anti-pattern: do not copy core/ or pages/ from monorepo into consumer projects.',
  ], 'See: examples/playwright-plug-and-play/README.md');

  slide(pptx, 'How to Use — Minimum Example (Tier 1)', [
    'npm install ai-healing-sdk @playwright/test',
    'In test: enableHealing(page, { healingEnabled: true, agentMode: "agentic" });',
    'Replace locator.click() with healable.click(locator) — same for fill.',
    'Run: AUTO_HEAL_DISCOVER=1 npx playwright test',
    'No healing-service required. No API key. Uses in-process heuristic agent.',
    'Optional: attachHealingSummary(testInfo, label, result) for HTML report evidence.',
  ]);

  slide(pptx, 'How to Use — With healing-service (Tier 2/3)', [
    'Terminal 1: export HEALING_LLM_PROVIDER=mock (or openai + HEALING_LLM_API_KEY)',
    'Terminal 1: npm run healing-service',
    'Terminal 2: export HEALING_SERVICE_URL=http://localhost:3921',
    'Terminal 2: export AUTO_HEAL_DISCOVER=1 && export HEALING_AGENT_MODE=agentic',
    'Terminal 2: npx playwright test',
    'Same enableHealing + healable code as Tier 1 — no test changes for LLM upgrade.',
    'Docs: docs/agentic-healing-setup.md',
  ]);

  slide(pptx, 'Page Object API (Strategy Chains)', [
    'For teams with explicit fallback chains in page objects:',
    'const strategies: LocatorStrategy[] = [{ name: "primary", resolve: (p) => p.getByRole(...) }];',
    'await clickHealing(page, strategies, { autoHeal: { enabled: true, agentMode: "agentic" } });',
    'Static strategies always run first — agent loop only after exhaustion.',
    'Returns HealingResult: usedStrategy, attempts[], autoHeal metadata.',
    'Used by Nova Retail LoginPage, RetailJourneyPage, AdminInventoryPage.',
  ]);

  tableSlide(
    pptx,
    'Key Environment Variables',
    ['Variable', 'Default', 'Purpose'],
    [
      ['AUTO_HEAL_DISCOVER', 'off', 'Enable healing after static failure'],
      ['HEALING_AGENT_MODE', 'agentic', 'agentic | legacy | off'],
      ['HEALING_AGENT_MAX_ITERATIONS', '3', 'Reflect loop cap'],
      ['HEALING_SERVICE_URL', '—', 'Route to healing-service'],
      ['HEALING_LLM_PROVIDER', 'mock', 'mock | heuristic | openai | anthropic'],
      ['HEALING_LLM_API_KEY', '—', 'On service only — not in tests'],
    ]
  );

  twoColumnSlide(
    pptx,
    'Reporting & Observability',
    'Playwright HTML report',
    [
      'attachHealingSummary() — usedStrategy, attempts',
      'autoHeal block: candidates, scores, reasons',
      'agent-trace when service returns agentTrace',
      'Demo toasts for stakeholder videos',
    ],
    'healing-service telemetry',
    [
      'heal.request / heal.response events',
      'agentTrace: model, tokens, toolCalls',
      'HEALING_SERVICE_VERBOSE=1 for console logs',
      'Dashboard ingest: docs/dashboard-ingest.md',
    ],
    'Forensic detail in Playwright • portfolio view in dashboard'
  );

  slide(pptx, 'Governance & Safety', [
    'Healing recovers locators — it does not fix wrong business assertions.',
    'Prefer static chains on critical production paths; agent heal as safety net.',
    'discoverOnly: true in demos — no silent code rewrite without review.',
    'Uniqueness gate: prefer candidates with count === 1 on page.',
    'LLM keys and DOM snapshots stay on service — redact passwords before prompts.',
    'Budget: HEALING_LLM_MAX_TOKENS + iteration cap prevent runaway cost.',
  ]);

  slide(pptx, 'Commands & Verification', [
    'npm run build:healing-service — build SDK + agents + service',
    'npm run healing-service — start POST /heal gateway (port 3921)',
    'npm run test:llm-agent — unit tests for LLM provider + agent',
    'npm run test:plug-and-play — external consumer demo',
    'npm run test:healing-showcases — static, seed, DOM scan demos',
    'npm run deck:agentic — regenerate this PowerPoint',
  ]);

  slide(pptx, 'Roadmap — Delivered (Phases 8–11)', [
    'Phase 8 — Autonomous login MVP: runAutonomousTest() from NL goal, zero locators in spec.',
    'Phase 9 — Multi-step checkout: verification agent, replan on assertion failure, 10-journey eval set.',
    'Phase 10 — Production governance: env secrets, domain allowlist, cost caps, suite KPIs, CI smoke.',
    'Phase 11 — Maintenance agent: locator persistence proposals (PR review), Jira tickets on repeated failure.',
    'Fully autonomous QA loop: heal → run → verify → govern → maintain.',
  ], 'Commands: npm run test:autonomous • test:autonomous-ci-smoke');

  tableSlide(
    pptx,
    'Autonomous Phases at a Glance',
    ['Phase', 'Capability', 'Key API / Command'],
    [
      ['8 — Login MVP', 'NL goal → Nova Retail login', 'runAutonomousTest()'],
      ['9 — Checkout', 'Add-to-cart → checkout + replan', 'maxReplans, verification agent'],
      ['10 — Governance', 'Secrets, cost caps, CI smoke', 'runAutonomousSuite(), KPIs JSON'],
      ['11 — Maintenance', 'Patches + Jira on repeat failures', 'runMaintenanceAgentAsync()'],
    ],
    'PRD: docs/PRD-Fully-Autonomous-AI-Agent.md'
  );

  slide(pptx, 'Phase 8–11 — How to Demo', [
    'npm run test:autonomous-login — single NL login goal',
    'npm run test:autonomous-checkout — login + cart + checkout journey',
    'npm run test:autonomous-ci-smoke — governed 2-journey suite with env secrets',
    'MAINTENANCE_AGENT=1 — failure tracking + locator patch proposals',
    'MAINTENANCE_PUBLISH_JIRA=1 + JIRA_* — live Jira ticket on repeated failures',
    'npm run deck:agentic — regenerate this deck',
  ]);

  slide(pptx, 'Future Enhancements', [
    'Vision agent — screenshot analysis for canvas/shadow DOM cases.',
    'Hosted healing-service SaaS for enterprise adopters.',
    'npm publish ai-healing-sdk@2.x with migration guide.',
    'Linear live publish (parallel to Jira integration).',
    'Evaluation harness KPI dashboard widgets in Real-Time Testing Dashboard.',
  ], 'Phases 8–11 complete — see docs/How-To-Use-Agentic-Healing.md');

  const end = pptx.addSlide();
  end.background = { color: C.navy };
  end.addText('Thank You', {
    x: 0.6, y: 1.9, w: 12.0, h: 0.9,
    fontFace: 'Arial', fontSize: 34, bold: true, color: 'FFFFFF', align: 'center',
  });
  end.addText('Agentic Self-Healing Playwright Framework', {
    x: 0.6, y: 2.95, w: 12.0, h: 0.5,
    fontFace: 'Arial', fontSize: 14, color: 'CBD5E0', align: 'center',
  });
  end.addText('Generate: npm run deck:agentic • Docs: docs/agentic-healing-setup.md', {
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
