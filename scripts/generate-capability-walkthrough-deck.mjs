/**
 * Capability + Walkthrough deck for agentic-platform.
 * Deep-dive section on Agentic architecture for live presentations.
 *
 * Output:
 *   docs/Agentic-Platform-Capability-Walkthrough.pptx
 *   docs/Agentic-Platform-Capability-Walkthrough-Speaker-Notes.md
 *
 * Run: npm run deck:capability
 */
import pptxgen from 'pptxgenjs';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPptx = join(__dirname, '..', 'docs', 'Agentic-Platform-Capability-Walkthrough.pptx');
const outNotes = join(__dirname, '..', 'docs', 'Agentic-Platform-Capability-Walkthrough-Speaker-Notes.md');

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
  white: 'FFFFFF',
};

function titleSlide(pptx, title, subtitle, footer = '') {
  const s = pptx.addSlide();
  s.background = { color: C.navy };
  s.addText(title, {
    x: 0.6, y: 1.5, w: 12.0, h: 1.2,
    fontFace: 'Arial', fontSize: 28, bold: true, color: C.white,
  });
  s.addText(subtitle, {
    x: 0.6, y: 2.9, w: 12.0, h: 1.0,
    fontFace: 'Arial', fontSize: 15, color: 'DCE6F2',
  });
  if (footer) {
    s.addText(footer, {
      x: 0.6, y: 5.0, w: 12.0, h: 0.35,
      fontFace: 'Arial', fontSize: 11, color: 'AFC1D9',
    });
  }
}

function sectionDivider(pptx, sectionNo, title, subtitle) {
  const s = pptx.addSlide();
  s.background = { color: C.navy };
  s.addText(`SECTION ${sectionNo}`, {
    x: 0.6, y: 1.7, w: 12.0, h: 0.4,
    fontFace: 'Arial', fontSize: 12, bold: true, color: '7EB8E8',
  });
  s.addText(title, {
    x: 0.6, y: 2.2, w: 12.0, h: 0.9,
    fontFace: 'Arial', fontSize: 30, bold: true, color: C.white,
  });
  s.addText(subtitle, {
    x: 0.6, y: 3.3, w: 12.0, h: 0.7,
    fontFace: 'Arial', fontSize: 14, color: 'DCE6F2',
  });
}

function slide(pptx, title, bullets = [], footer = '') {
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 0.28,
    fill: { color: C.blue }, line: { width: 0 },
  });
  s.addText(title, {
    x: 0.6, y: 0.45, w: 12.0, h: 0.55,
    fontFace: 'Arial', fontSize: 20, bold: true, color: C.navy,
  });
  if (bullets.length) {
    s.addText(bullets.map((b) => ({ text: b, options: { bullet: true } })), {
      x: 0.7, y: 1.15, w: 12.0, h: 3.9,
      fontFace: 'Arial', fontSize: 13, color: C.text, lineSpacingMultiple: 1.14,
    });
  }
  if (footer) {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.7, y: 5.15, w: 12.0, h: 0.7,
      fill: { color: C.bg }, line: { color: 'D9E2EC', width: 1 },
    });
    s.addText(footer, {
      x: 0.9, y: 5.3, w: 11.6, h: 0.4,
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
      x, y: 1.5, w: 5.9, h: 3.4,
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

function flowSlide(pptx, title, lines, footer = '') {
  const s = slide(pptx, title, []);
  s.addText(lines.join('\n'), {
    x: 0.85, y: 1.15, w: 11.8, h: 3.8,
    fontFace: 'Courier New', fontSize: 12, color: C.text,
    lineSpacingMultiple: 1.18,
  });
  if (footer) {
    s.addText(footer, {
      x: 0.7, y: 5.2, w: 12.0, h: 0.4,
      fontFace: 'Arial', fontSize: 10, italic: true, color: C.muted, align: 'center',
    });
  }
}

function tableSlide(pptx, title, headers, rows, colW, footer = '') {
  const s = slide(pptx, title, []);
  const tableData = [
    headers.map((h) => ({ text: h, options: { bold: true, color: C.white, fill: { color: C.navy } } })),
    ...rows.map((row, i) =>
      row.map((cell) => ({
        text: cell,
        options: { fill: { color: i % 2 === 0 ? C.white : C.bg } },
      }))
    ),
  ];
  s.addTable(tableData, {
    x: 0.5, y: 1.1, w: 12.3,
    fontFace: 'Arial', fontSize: 11, color: C.text,
    border: { type: 'solid', color: 'D9E2EC', pt: 1 },
    colW: colW || headers.map(() => 12.3 / headers.length),
  });
  if (footer) {
    s.addText(footer, {
      x: 0.7, y: 5.25, w: 12.0, h: 0.35,
      fontFace: 'Arial', fontSize: 10, italic: true, color: C.muted, align: 'center',
    });
  }
}

async function main() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = 'Agentic Platform — Capability & Walkthrough Deck';
  pptx.author = 'Quality Engineering';

  // ═══════════════════════════════════════════════════════════
  // OPENING
  // ═══════════════════════════════════════════════════════════
  titleSlide(
    pptx,
    'Agentic Platform — Capability & Walkthrough',
    'What the platform can do • How to demo it live • Deep dive on Agentic healing',
    'GitHub: mmohansqaai/agentic-platform  •  Docs: UAT-Test-Plan-and-Usage.md'
  );

  slide(pptx, 'Agenda (Walkthrough Flow)', [
    'Section 1 — Platform at a glance (problem → solution → products)',
    'Section 2 — Capability map (healing, multi-framework, autonomous, SaaS)',
    'Section 3 — AGENTIC deep dive (separate section — spend most of the time here)',
    'Section 4 — Live walkthrough script (commands + what to show on screen)',
    'Section 5 — Architecture, packages, deployment modes',
    'Section 6 — Autonomous QA layer (goal-driven tests)',
    'Section 7 — How to adopt, UAT checklist, talking points by role',
  ], 'Recommended talk time: 25–40 min  •  Agentic section alone: 10–15 min');

  // ═══════════════════════════════════════════════════════════
  // SECTION 1 — PLATFORM AT A GLANCE
  // ═══════════════════════════════════════════════════════════
  sectionDivider(
    pptx,
    '1',
    'Platform at a Glance',
    'One sentence pitch → problem → what we built'
  );

  slide(pptx, 'One-Sentence Pitch', [
    'When UI locators break, this platform uses an AI agent to find the right element, validate it on the live page, and keep the test running — across Playwright, Cypress, and Selenium.',
    'Optionally, you can also run goal-driven “autonomous” tests (e.g. “log in as test@demo.com”) that plan their own steps and reuse the same healing brain.',
  ], 'Healing = flat-tyre fix  •  Autonomous = full driver  •  Same platform');

  twoColumnSlide(
    pptx,
    'The Problem We Solve',
    'Without healing',
    [
      'UI change → selector fails',
      'Test fails in CI',
      'Engineer finds new locator',
      'Code update + re-run',
      'Hours of flaky-test toil',
      'Each framework reinvents recovery',
    ],
    'With this platform',
    [
      'UI change → selector fails',
      'Agent observes the live page',
      'Proposes + validates new locators',
      'Test often self-recovers in-run',
      'Report shows what was healed',
      'One brain, many frameworks',
    ],
    'ROI: less maintenance, faster feedback, productizable as SaaS'
  );

  tableSlide(
    pptx,
    'Two Products on One Platform',
    ['Product', 'What it does', 'Who uses it'],
    [
      ['Self-Healing', 'Broken locator → agent finds new one → retry', 'Any team with UI tests'],
      ['Autonomous QA', 'NL / goal → agent plans steps + executes', 'Teams reducing test authoring'],
      ['Healing-service', 'Optional cloud brain (POST /heal)', 'SaaS / LLM / central policy'],
      ['Nova Retail demo', 'Reference e-commerce app + full suites', 'Demos, UAT, onboarding'],
    ],
    [2.8, 5.5, 4.0],
    'Autonomous sits on top of healing — it does not replace it'
  );

  // ═══════════════════════════════════════════════════════════
  // SECTION 2 — CAPABILITY MAP
  // ═══════════════════════════════════════════════════════════
  sectionDivider(
    pptx,
    '2',
    'Capability Map',
    'What the framework can do today — by layer'
  );

  tableSlide(
    pptx,
    'Capability Matrix (Current)',
    ['Capability', 'Status', 'How to demo'],
    [
      ['Playwright self-healing (local agent)', '✅ Shipped', 'test:plug-and-play'],
      ['Playwright + healing-service / LLM', '✅ Shipped', 'healing-service + HEALING_SERVICE_URL'],
      ['Cypress healing (local + remote)', '✅ Shipped', 'ai-healing-cypress'],
      ['Selenium JS healing (local + remote)', '✅ Shipped', 'ai-healing-selenium'],
      ['Selenium Java (HTTP client)', '✅ Shipped', 'ai-healing-java (remote today)'],
      ['Autonomous login / checkout', '✅ Shipped', 'nova -- test:autonomous-login'],
      ['Governance + CI smoke + KPIs', '✅ Shipped', 'nova -- test:autonomous-ci-smoke'],
      ['Maintenance / Jira / PR proposals', '✅ Shipped', 'MAINTENANCE_* flags'],
      ['npm publish to registry', '⏳ Deferred', 'After UAT sign-off'],
      ['Hosted SaaS production', '⏳ Next', 'Deploy healing-service'],
    ],
    [5.2, 2.0, 5.1]
  );

  slide(pptx, 'Capability Groups (Talk Track)', [
    '1. Locator healing — recover broken selectors mid-test (core value).',
    '2. Agentic loop — observe → tools → act → reflect (not a static fallback list).',
    '3. Multi-framework — Playwright, Cypress, Selenium JS/Java share contracts.',
    '4. Dual mode — local agent (no server) OR cloud healing-service (LLM).',
    '5. Autonomous QA — goal-driven journeys that reuse healing.',
    '6. Observability — Playwright report attachments + agentTrace.',
    '7. Governance — domain allowlist, cost caps, secrets, maintenance tickets.',
  ], 'If time is short: demo #1 + explain #2 in depth');

  // ═══════════════════════════════════════════════════════════
  // SECTION 3 — AGENTIC DEEP DIVE
  // ═══════════════════════════════════════════════════════════
  sectionDivider(
    pptx,
    '3',
    'AGENTIC — Deep Dive',
    'What “agentic” means here • The loop • Tools • Local vs cloud • Honest boundaries'
  );

  slide(pptx, 'What “Agentic” Means in This Platform', [
    'Agentic ≠ “always call ChatGPT”.',
    'Agentic = a bounded loop that observes the page, uses tools, tries actions, and learns from failures inside the same test run.',
    'Static locators still run first (fast path, $0). The agent only starts after they fail.',
    'Every iteration has a hard cap (default 3) — no infinite AI loops.',
    'Validation always happens on the live browser — the agent never “assumes” a locator works.',
  ], 'Honest label: Agentic architecture + optional LLM — not 100% LLM-driven');

  twoColumnSlide(
    pptx,
    'Agentic vs Traditional Self-Healing',
    'Traditional / rule-based',
    [
      'Fixed ordered fallback list',
      'Try A, then B, then C',
      'Same list every time',
      'No memory of failed tries',
      'No DOM reasoning mid-run',
      'Breaks when UI structure shifts',
    ],
    'Agentic (this platform)',
    [
      'Observe live DOM + URL + hints',
      'Tools propose candidates dynamically',
      'Validate each candidate on page',
      'Reflect: exclude failed candidates',
      'Optional LLM escalation',
      'Adapts to unexpected UI changes',
    ],
    'Key differentiator for AI / CTO audiences'
  );

  flowSlide(
    pptx,
    'The Agent Loop (Core Behavior)',
    [
      '  1. OBSERVE',
      '     Capture URL, title, structured DOM snapshot, failure hints',
      '',
      '  2. REASON  (tool use)',
      '     list_heuristic_candidates  •  search_dom  •  optional LLM propose',
      '',
      '  3. ACT',
      '     Try each candidate on live browser (count / click / fill / visible)',
      '',
      '  4. REFLECT',
      '     Record failures → exclude bad candidates → next iteration (≤ N)',
      '',
      '  5. COMMIT (on success)',
      '     History + optional persistence + Playwright report attachment',
    ],
    'Code: ai-healing-agent + ai-healing-sdk agent-loop • Max iterations via HEALING_AGENT_MAX_ITERATIONS'
  );

  slide(pptx, 'Step Detail — OBSERVE', [
    'When primary locator fails, the framework builds a HealingRequest.',
    'Includes: action type (click/fill), original selector, page URL/title.',
    'Includes: domSnapshot — inventory of interactive elements (not raw HTML dump).',
    'Includes: failure hints / intent (e.g. “login”, “email”, “cart”).',
    'Includes: priorValidationResults on iteration 2+ (what already failed).',
    'Purpose: give the agent enough context without sending passwords or full page HTML blindly.',
  ], 'Contract lives in packages/ai-healing-core');

  slide(pptx, 'Step Detail — REASON (Tools)', [
    'list_heuristic_candidates — seed rules + DOM-scan synthesis (works offline, no API key).',
    'search_dom — filter snapshot by role, tag, text, intent hints.',
    'Viability scoring — prefer unique, visible, actionable elements.',
    'Optional LLM (cloud path) — structured JSON locator proposals (role+name or CSS).',
    'LLM never executes code — it only suggests locators; browser validation is mandatory.',
    'Rule-based locator-agent remains as ensemble / fallback when LLM is on.',
  ], 'Local tools = deterministic  •  LLM = optional intelligence escalation');

  slide(pptx, 'Step Detail — ACT + REFLECT', [
    'ACT: each candidate is tried for real (count === 1 preferred, then perform action).',
    'If candidate fails → recorded in priorValidationResults.',
    'REFLECT: next iteration excludes known-bad locators and may try new strategies.',
    'Loop stops on first successful action OR when iteration cap is hit.',
    'If all fail → test fails normally (healing does not hide broken assertions).',
    'Success path can attach evidence to Playwright HTML report for auditors.',
  ], 'Healing recovers locators — it does not invent business assertions');

  tableSlide(
    pptx,
    'Agentic Maturity by Setup (Important for Walkthrough)',
    ['Setup', 'What runs', 'Real LLM?'],
    [
      ['SDK / adapter only', 'In-process local agent + heuristic tools', 'No'],
      ['healing-service + mock', 'HTTP agent loop + mock LLM', 'No (simulated)'],
      ['healing-service + openai/anthropic', 'llm-locator-agent + real model', 'Yes'],
      ['HEALING_AGENT_MODE=legacy', 'Old single-shot discoverer', 'No'],
    ],
    [4.2, 5.2, 2.9],
    'Same test code across tiers — only environment variables change'
  );

  twoColumnSlide(
    pptx,
    'Local Agent vs Cloud Agent',
    'Local (embedded)',
    [
      'Package: ai-healing-agent',
      'No server, no API key',
      'Best for CI, laptops, air-gap',
      'Heuristic tools + DOM scan',
      'agentMode: local or auto (no URL)',
      'Fast, predictable cost ($0)',
    ],
    'Cloud (healing-service)',
    [
      'Service: POST /heal on :3921',
      'Optional OpenAI / Anthropic',
      'Best for quality + metering',
      'Central policy / SaaS path',
      'HEALING_SERVICE_URL set',
      'Keys stay on service only',
    ],
    'Hybrid auto: use cloud if URL set, else local'
  );

  flowSlide(
    pptx,
    'End-to-End Healing Path (What You Show Live)',
    [
      '  Test: healable.click("#wrong-id")',
      '      ↓',
      '  Primary locator FAILS',
      '      ↓',
      '  Healing ON? (AUTO_HEAL_DISCOVER / enableHealing)',
      '      ├─ No  → test fails (normal)',
      '      └─ Yes → Agent loop starts',
      '              OBSERVE → REASON → ACT → REFLECT',
      '      ↓',
      '  Candidate works → CONTINUE TEST ✅',
      '  Report shows: strategy, attempts, autoHeal.usedAutoGenerated',
    ],
    'Demo tip: use headed mode so audience sees the retry'
  );

  slide(pptx, 'What Agentic Is NOT (Set Expectations)', [
    'Not always-on ChatGPT inside every test.',
    'Not autonomous bug fixing of product code.',
    'Not assertion repair (“expect(total).toBe(99)” stays your responsibility).',
    'Not vision/screenshot AI as the primary path (DOM-first today).',
    'Not silent source-code rewrite without review (persistence is proposal/opt-in).',
    'Not a replacement for good primary locators — static strategies still win first.',
  ], 'Credibility slide — use early with technical audiences');

  // ═══════════════════════════════════════════════════════════
  // SECTION 4 — LIVE WALKTHROUGH
  // ═══════════════════════════════════════════════════════════
  sectionDivider(
    pptx,
    '4',
    'Live Walkthrough Script',
    'Exact commands • What to say • What to show on screen'
  );

  slide(pptx, 'Walkthrough Prep (Before the Meeting)', [
    'Clone or open: https://github.com/mmohansqaai/agentic-platform',
    'npm install && npm run install:browsers',
    'Optional: npm run build:healing-service (if you will demo cloud path)',
    'Have two terminals ready (local path + service path).',
    'Open docs/UAT-Test-Plan-and-Usage.md as backup checklist.',
    'Prefer headed demos for stakeholders; CI mode for speed checks.',
  ]);

  tableSlide(
    pptx,
    'Demo Sequence (Recommended 20–30 min)',
    ['#', 'Demo', 'Command / action', 'Message'],
    [
      ['1', 'Healing (local)', 'npm run test:plug-and-play', 'Broken selector recovers without server'],
      ['2', 'Report evidence', 'Open playwright-report', 'Show strategy / attempts / autoHeal'],
      ['3', 'Unit brain', 'npm run test:unit', 'Core contracts + agent logic green'],
      ['4', 'Cloud agent', 'healing-service + HEALING_SERVICE_URL', 'Same tests, smarter remote brain'],
      ['5', 'Autonomous', 'nova -- test:autonomous-login', 'Goal-driven test reuses healing'],
    ],
    [0.7, 2.3, 5.5, 3.8]
  );

  flowSlide(
    pptx,
    'Demo 1 — Plug-and-Play Healing (Local)',
    [
      '  export AUTO_HEAL_DISCOVER=1',
      '  export HEALING_AGENT_MODE=agentic',
      '  npm run test:plug-and-play',
      '',
      '  Say: “This test intentionally uses a wrong selector.”',
      '  Show: browser retries after failure.',
      '  Say: “Local agent — no server, no API key.”',
      '  Then: open report → healing attachment.',
    ],
    'File to open if asked: examples/playwright-plug-and-play/tests/plug-and-play.spec.ts'
  );

  flowSlide(
    pptx,
    'Demo 2 — Healing-Service (Cloud Path)',
    [
      '  Terminal 1:',
      '    export HEALING_LLM_PROVIDER=mock',
      '    npm run healing-service',
      '    # http://localhost:3921',
      '',
      '  Terminal 2:',
      '    curl http://localhost:3921/health',
      '    export HEALING_SERVICE_URL=http://localhost:3921',
      '    export AUTO_HEAL_DISCOVER=1',
      '    npm run test:plug-and-play:ci',
      '',
      '  Say: “Same test code — only env changed.”',
    ],
    'Upgrade to openai/anthropic later without rewriting tests'
  );

  flowSlide(
    pptx,
    'Demo 3 — Autonomous Login (Nova)',
    [
      '  npm run install:nova-retail-qa',
      '  npm run nova -- test:autonomous-login',
      '',
      '  Say: “We did not hardcode every click.”',
      '  Say: “Agent plans steps from a goal; healing still helps if UI drifts.”',
      '',
      '  Optional add-on:',
      '    npm run nova -- test:autonomous-ci-smoke',
    ],
    'Autonomous = product layer on top of healing, not a separate product story'
  );

  slide(pptx, 'Walkthrough Talking Points (Cheat Sheet)', [
    'Problem: UI churn breaks selectors → expensive maintenance.',
    'Solution: agentic healing loop recovers in-run.',
    'Differentiation: tools + reflect + live validation — not a static fallback list.',
    'Optionality: works offline; cloud/LLM is escalation, not lock-in.',
    'Multi-framework: one brain, thin adapters.',
    'Autonomous: goal-driven tests reuse the same healing spine.',
    'Next: UAT → npm publish → SaaS deploy.',
  ]);

  // ═══════════════════════════════════════════════════════════
  // SECTION 5 — ARCHITECTURE
  // ═══════════════════════════════════════════════════════════
  sectionDivider(
    pptx,
    '5',
    'Architecture & Packages',
    'One brain • Many adapters • Optional cloud'
  );

  flowSlide(
    pptx,
    'Architecture Snapshot',
    [
      '  Framework adapters',
      '    Playwright SDK  •  Cypress  •  Selenium JS  •  Selenium Java',
      '           ↓',
      '  Shared spine',
      '    ai-healing-core (contracts / HealingDriver)',
      '    ai-healing-agent (local observe→act→reflect loop)',
      '           ↓',
      '  Optional cloud',
      '    healing-service  →  locator-agent + llm-locator-agent',
      '           ↓',
      '  Autonomous layer',
      '    autonomous-qa-sdk + autonomous-test-agent  (Nova demo)',
    ]
  );

  tableSlide(
    pptx,
    'Package Map (What to Mention)',
    ['Package / path', 'Role'],
    [
      ['packages/ai-healing-core', 'Shared contracts + HealingDriver'],
      ['packages/ai-healing-agent', 'Local agent loop (no server)'],
      ['packages/ai-healing-sdk', 'Playwright plug-and-play SDK'],
      ['packages/ai-healing-cypress / selenium / java', 'Framework adapters'],
      ['packages/autonomous-qa-sdk', 'Goal-driven QA + maintenance'],
      ['services/healing-service', 'SaaS gateway POST /heal'],
      ['agents/*', 'Locator + LLM + autonomous planner brains'],
      ['examples/nova-retail-qa', 'Reference app + full suites'],
      ['examples/playwright-plug-and-play', 'Minimal external-style demo'],
    ],
    [5.5, 6.8]
  );

  tableSlide(
    pptx,
    'Multi-Framework Coverage',
    ['Framework', 'Package', 'Local agent', 'Cloud'],
    [
      ['Playwright', 'ai-healing-sdk', '✅ Full', '✅'],
      ['Cypress', 'ai-healing-cypress', '✅ Parity', '✅'],
      ['Selenium JS', 'ai-healing-selenium', '✅ Parity', '✅'],
      ['Selenium Java', 'ai-healing-java', '⚠️ Remote today', '✅'],
    ],
    [2.8, 3.8, 2.8, 2.9],
    'Java local agent parity is on the roadmap'
  );

  // ═══════════════════════════════════════════════════════════
  // SECTION 6 — AUTONOMOUS
  // ═══════════════════════════════════════════════════════════
  sectionDivider(
    pptx,
    '6',
    'Autonomous QA Layer',
    'Goal-driven tests that reuse healing'
  );

  slide(pptx, 'Autonomous QA — What It Adds', [
    'You give a goal (natural language / structured intent), not every locator step.',
    'Planner chooses steps; executor runs them through healable actions.',
    'If a locator breaks mid-journey, healing engages automatically.',
    'Verification / replan handles assertion failures with bounded retries.',
    'Governance: secrets, domain allowlist, cost caps, suite KPIs.',
    'Maintenance agent: repeated failures → tickets / locator patch proposals.',
  ], 'Healing = recover element  •  Autonomous = drive the journey');

  tableSlide(
    pptx,
    'Autonomous Demo Commands',
    ['Command', 'Shows'],
    [
      ['npm run nova -- test:autonomous-login', 'NL / goal login'],
      ['npm run nova -- test:autonomous-checkout', 'Multi-step cart → checkout'],
      ['npm run nova -- test:autonomous-ci-smoke', 'Governed CI-style suite'],
      ['npm run nova -- test:healing-showcases', 'Healing showcases inside Nova'],
    ],
    [6.5, 5.8]
  );

  // ═══════════════════════════════════════════════════════════
  // SECTION 7 — ADOPTION / CLOSE
  // ═══════════════════════════════════════════════════════════
  sectionDivider(
    pptx,
    '7',
    'Adoption, UAT & Close',
    'How teams start • Sign-off path • Role talking points'
  );

  slide(pptx, 'Adoption Tiers (Same Code, Different Env)', [
    'Tier 1 — SDK only: enableHealing + healable.* + AUTO_HEAL_DISCOVER=1 (no server).',
    'Tier 2 — Add healing-service with mock/heuristic provider.',
    'Tier 3 — Turn on OpenAI/Anthropic on the service (keys never in test process).',
    'Principle: progressive enhancement — start local, escalate when needed.',
    'Anti-pattern: copying monorepo internals into consumer apps.',
  ]);

  tableSlide(
    pptx,
    'Key Environment Variables',
    ['Variable', 'Typical UAT', 'Purpose'],
    [
      ['AUTO_HEAL_DISCOVER', '1', 'Enable healing after primary fail'],
      ['HEALING_AGENT_MODE', 'agentic / auto', 'Agent loop vs legacy'],
      ['HEALING_AGENT_MAX_ITERATIONS', '3', 'Reflect loop cap'],
      ['HEALING_SERVICE_URL', 'http://localhost:3921', 'Route to cloud agent'],
      ['HEALING_LLM_PROVIDER', 'mock', 'mock | openai | anthropic'],
    ],
    [4.2, 3.5, 4.6]
  );

  slide(pptx, 'UAT Path (After This Walkthrough)', [
    'Day 1 — P0 smoke: unit + plug-and-play + autonomous login/ci-smoke.',
    'Day 2 — Service integration: healing-service + phase2/phase3 + Nova with URL.',
    'Day 3 — Multi-framework builds + sign-off sheet.',
    'Doc: docs/UAT-Test-Plan-and-Usage.md',
    'After UAT: npm publish + SaaS deploy (explicitly deferred today).',
  ]);

  twoColumnSlide(
    pptx,
    'Talking Points by Role',
    'CTO / Leadership',
    [
      'Cuts locator-maintenance toil',
      'Works offline; cloud is upsell',
      'Clean adapters + shared brain',
      'SaaS metering via POST /heal',
      'Risk: governance + caps included',
    ],
    'AI Director / Architects',
    [
      'True agent loop (tools + reflect)',
      'LLM optional escalation',
      'Live validation always required',
      'Shared HealingRequest/Response',
      'Eval-ready contracts for A/B',
    ]
  );

  slide(pptx, 'Repos & Docs to Leave Behind', [
    'Full monorepo: https://github.com/mmohansqaai/agentic-platform',
    'UAT plan: docs/UAT-Test-Plan-and-Usage.md',
    'CTO brief: docs/CTO-AI-Director-Agentic-Healing-Brief.md',
    'How-to: docs/How-To-Use-Agentic-Healing.md',
    'Setup: docs/agentic-healing-setup.md',
    'Regenerate this deck: npm run deck:capability',
  ]);

  const end = pptx.addSlide();
  end.background = { color: C.navy };
  end.addText('Thank You — Ready for Live Walkthrough', {
    x: 0.6, y: 1.9, w: 12.0, h: 0.9,
    fontFace: 'Arial', fontSize: 26, bold: true, color: C.white, align: 'center',
  });
  end.addText('Start with: AUTO_HEAL_DISCOVER=1 npm run test:plug-and-play', {
    x: 0.6, y: 3.0, w: 12.0, h: 0.5,
    fontFace: 'Arial', fontSize: 14, color: 'CBD5E0', align: 'center',
  });
  end.addText('Deep dive: Section 3 (Agentic)  •  Commands: Section 4', {
    x: 0.6, y: 3.7, w: 12.0, h: 0.4,
    fontFace: 'Arial', fontSize: 13, color: 'AFC1D9', align: 'center',
  });
  end.addText('npm run deck:capability', {
    x: 0.6, y: 4.6, w: 12.0, h: 0.35,
    fontFace: 'Arial', fontSize: 11, color: '7EB8E8', align: 'center',
  });

  await pptx.writeFile({ fileName: outPptx });
  console.log('Wrote:', outPptx);

  const notes = `# Agentic Platform — Capability Walkthrough Speaker Notes

**Deck:** \`docs/Agentic-Platform-Capability-Walkthrough.pptx\`  
**Regenerate:** \`npm run deck:capability\`  
**Audience:** stakeholders, QA leads, CTO/AI Director walkthrough  
**Suggested time:** 25–40 minutes (Section 3 Agentic = 10–15 min)

---

## How to use this deck

1. **Sections 1–2** — set context fast (5 min).
2. **Section 3 (Agentic)** — go deep; this is the differentiator.
3. **Section 4** — switch to terminal and run demos live.
4. **Sections 5–7** — only if audience wants architecture / autonomous / adoption.

---

## Section 1 — Platform at a glance

**Say:**
> UI tests break when selectors change. This platform recovers in-run using an agent that observes the page, proposes locators, validates them live, and retries — across Playwright, Cypress, and Selenium.

**Analogy:**
- Healing = fixing a flat tyre mid-journey
- Autonomous = letting the car drive from a destination goal

---

## Section 2 — Capability map

Hit these seven bullets; if short on time, skip maintenance/Jira:

1. Locator healing  
2. Agentic loop  
3. Multi-framework  
4. Local + cloud modes  
5. Autonomous QA  
6. Observability  
7. Governance  

---

## Section 3 — AGENTIC deep dive (spend time here)

### Opening line
> Agentic here does **not** mean “ChatGPT on every click.” It means a **bounded loop**: observe → use tools → act on the browser → reflect on failures.

### Must-cover points
1. Static locators still run first (fast path).
2. Agent only starts after failure.
3. Live browser validation is mandatory.
4. Iteration cap (default 3).
5. Local agent works without API keys.
6. Cloud/LLM is optional escalation via \`healing-service\`.
7. Healing does **not** invent business assertions.

### Local vs cloud one-liner
> Same test code. If \`HEALING_SERVICE_URL\` is set, use cloud brain; otherwise use embedded local agent.

### Credibility
Use the “What Agentic Is NOT” slide early with technical audiences — builds trust.

---

## Section 4 — Live walkthrough script

### Prep
\`\`\`bash
git clone https://github.com/mmohansqaai/agentic-platform.git
cd agentic-platform
npm install && npm run install:browsers
\`\`\`

### Demo 1 — Local healing (must do)
\`\`\`bash
export AUTO_HEAL_DISCOVER=1
export HEALING_AGENT_MODE=agentic
npm run test:plug-and-play
\`\`\`
**Show:** headed browser retry + HTML report healing attachment.

### Demo 2 — Cloud path (optional)
Terminal 1:
\`\`\`bash
export HEALING_LLM_PROVIDER=mock
npm run healing-service
\`\`\`
Terminal 2:
\`\`\`bash
export HEALING_SERVICE_URL=http://localhost:3921
export AUTO_HEAL_DISCOVER=1
npm run test:plug-and-play:ci
\`\`\`
**Say:** “Same tests — only environment changed.”

### Demo 3 — Autonomous
\`\`\`bash
npm run install:nova-retail-qa
npm run nova -- test:autonomous-login
\`\`\`

---

## Section 5 — Architecture (if asked)

One brain (\`ai-healing-core\` + \`ai-healing-agent\`), thin adapters, optional \`healing-service\`.

Java is cloud-first today; local Java agent is roadmap.

---

## Section 6 — Autonomous

Only if audience cares about goal-driven tests. Emphasize: **reuses healing**, does not replace it.

---

## Section 7 — Close

Leave behind:
- https://github.com/mmohansqaai/agentic-platform
- \`docs/UAT-Test-Plan-and-Usage.md\`
- \`docs/CTO-AI-Director-Agentic-Healing-Brief.md\`

**Next ask:** UAT Day 1 smoke → sign-off → npm publish / SaaS.

---

## 60-second elevator version

> We built an agentic self-healing layer for UI tests. When a locator breaks, an agent observes the DOM, proposes candidates, validates them live, and retries — Playwright, Cypress, Selenium. Local agent needs no server; cloud service adds LLM. On top, autonomous tests run from goals and reuse the same healing brain.
`;

  writeFileSync(outNotes, notes, 'utf8');
  console.log('Wrote:', outNotes);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
