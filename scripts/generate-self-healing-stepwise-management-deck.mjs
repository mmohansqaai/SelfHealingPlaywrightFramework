/**
 * Management-focused, step-by-step deck with real code snippets.
 * Output: docs/Self-Healing-Stepwise-Management-Deck.pptx
 */
import pptxgen from 'pptxgenjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'docs', 'Self-Healing-Stepwise-Management-Deck.pptx');

const C = {
  primary: '1f3a5f',
  accent: '2b6cb0',
  text: '2d3748',
  light: 'f8fafc',
  ok: '2f855a',
};

function titleSlide(pptx, title, subtitle) {
  const s = pptx.addSlide();
  s.background = { color: C.primary };
  s.addText(title, {
    x: 0.5, y: 1.8, w: 12.3, h: 1.4,
    fontFace: 'Arial', fontSize: 32, bold: true, color: 'FFFFFF',
  });
  s.addText(subtitle, {
    x: 0.5, y: 3.35, w: 12.3, h: 0.9,
    fontFace: 'Arial', fontSize: 15, color: 'E2E8F0',
  });
}

function section(pptx, title) {
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 0.28,
    fill: { color: C.accent }, line: { color: C.accent, width: 0 },
  });
  s.addText(title, {
    x: 0.5, y: 0.48, w: 12.2, h: 0.6,
    fontFace: 'Arial', fontSize: 22, bold: true, color: C.primary,
  });
  return s;
}

function bullets(s, lines, y = 1.25) {
  s.addText(lines.map((t) => ({ text: t, options: { bullet: true } })), {
    x: 0.6, y, w: 12.0, h: 2.4,
    fontFace: 'Arial', fontSize: 14, color: C.text, lineSpacingMultiple: 1.2,
  });
}

function codeBlock(s, title, code, y = 3.05, h = 3.9) {
  s.addText(title, {
    x: 0.6, y: y - 0.35, w: 12.0, h: 0.3,
    fontFace: 'Arial', fontSize: 12, bold: true, color: C.accent,
  });
  s.addText(code, {
    x: 0.6, y, w: 12.0, h,
    fontFace: 'Courier New', fontSize: 11, color: '1a202c',
    fill: { color: C.light }, margin: 8, valign: 'top',
  });
}

async function main() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = 'Self-Healing Framework — Stepwise Management Deck';

  titleSlide(
    pptx,
    'Self-Healing in Our Playwright Framework',
    'Step-by-step walkthrough with real code snippets for management presentation'
  );

  let s = section(pptx, '1) The business problem we solved');
  bullets(s, [
    'Classic automation fails when small UI changes happen (label/text/id changes).',
    'That creates false alarms, slows release confidence, and increases maintenance cost.',
    'Our framework adds “self-healing” to make tests resilient while keeping failures transparent.',
  ]);

  s = section(pptx, '2) Step-by-step self-healing flow');
  bullets(s, [
    'Step 1: Define ordered locator strategies for each element (stable to fallback).',
    'Step 2: Run action through a healing wrapper (click/fill/visible).',
    'Step 3: First successful strategy is used; attempts are recorded.',
    'Step 4: Attach strategy evidence into the Playwright HTML report.',
    'Step 5: Use reports in CI to spot drift and tune selectors proactively.',
  ]);

  s = section(pptx, '3) Core engine: tries each strategy until success');
  bullets(s, [
    'This is the central healing loop in `core/self-healing.ts`.',
    'If all strategies fail, it throws a single actionable summary with attempt details.',
  ]);
  codeBlock(
    s,
    'Code snippet — `withHealingPage()`',
`for (const s of strategies) {
  const locator = s.resolve(page);
  try {
    const value = await action(locator);
    attempts.push({ strategy: s.name, ok: true });
    return { value, usedStrategy: s.name, attempts };
  } catch (e) {
    lastError = e;
    recordFailure(attempts, s.name, e);
  }
}
throw new Error(
  \`Self-healing exhausted \${strategies.length} strategies.\\n\${summary}\`,
  { cause: lastError }
);`
  );

  s = section(pptx, '4) Real example: login page strategy chain');
  bullets(s, [
    'The same “Email” field is defined with multiple selectors.',
    'Primary strategy uses semantic label; fallbacks handle markup drift.',
  ]);
  codeBlock(
    s,
    'Code snippet — `pages/login.page.ts` email strategies',
`private emailStrategies(): LocatorStrategy[] {
  return [
    { name: 'getByLabel-Email', resolve: (p) => p.getByLabel(/email/i) },
    {
      name: 'placeholder-email',
      resolve: (p) =>
        p.locator('input[type="email"], input[name*="email" i], input[id*="email" i]').first(),
    },
    { name: 'role-textbox-first', resolve: (p) => p.getByRole('textbox').first() },
  ];
}`
  );

  s = section(pptx, '5) How wrappers are used in page objects');
  bullets(s, [
    'Business flows remain readable; healing complexity stays in one place.',
    'Every action returns metadata (`usedStrategy`, attempts).',
  ]);
  codeBlock(
    s,
    'Code snippet — wrapper usage',
`async fillEmail(value: string): Promise<HealingResult<void>> {
  return fillHealing(this.page, this.emailStrategies(), value);
}

async submit(): Promise<HealingResult<void>> {
  return clickHealing(this.page, this.submitStrategies());
}`,
    3.0,
    2.4
  );

  s = section(pptx, '6) Evidence capture: healing summary in report');
  bullets(s, [
    'We attach strategy metadata directly to test artifacts.',
    'Management can audit “why test passed” (primary or fallback strategy).',
  ]);
  codeBlock(
    s,
    'Code snippet — `core/healing-reporter.ts`',
`const lines = [
  \`Used strategy: \${result.usedStrategy}\`,
  '',
  'Attempts:',
  ...result.attempts.map((a) =>
    \`\${a.ok ? '✓' : '✗'} \${a.strategy}\${a.error ? \` — \${a.error}\` : ''}\`
  ),
];
return testInfo.attach('<label>-healing', {
  body: lines.join('\\n'),
  contentType: 'text/plain',
});`
  );

  s = section(pptx, '7) Test usage: where summaries are attached');
  bullets(s, [
    'This is how production tests capture the healing evidence at run time.',
  ]);
  codeBlock(
    s,
    'Code snippet — `tests/login.spec.ts`',
`const loaded = await login.expectLoaded();
await attachHealingSummary(testInfo, 'page-loaded', loaded);

const { email, password, submit } = await login.loginAsCustomer();
await attachHealingSummary(testInfo, 'email', email);
await attachHealingSummary(testInfo, 'password', password);
await attachHealingSummary(testInfo, 'submit', submit);`
  );

  s = section(pptx, '8) CI and governance');
  bullets(s, [
    'CI runs on GitHub Actions with HTML + JSON reporting.',
    'Dashboard ingestion now posts metrics + zipped HTML report using multipart curl.',
    'This creates traceability from pipeline status to human-readable proof.',
  ]);

  s = section(pptx, '9) Management view: measurable value');
  bullets(s, [
    'Lower maintenance overhead when UI refactors happen.',
    'Reduced false negatives improves trust in automation.',
    'Faster diagnosis with strategy-level logs and report attachments.',
    'Reusable architecture across modules (login, retail journey, admin inventory).',
  ]);
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 3.35, w: 12.0, h: 1.45,
    fill: { color: 'edf2f7' }, line: { color: 'cbd5e0', width: 1 },
  });
  s.addText('Key message: We are not just adding tests; we are adding resilience + observability to automation.', {
    x: 0.85, y: 3.8, w: 11.4, h: 0.6,
    fontFace: 'Arial', fontSize: 15, bold: true, color: C.ok, align: 'center',
  });

  s = section(pptx, '10) Suggested talk track (5–7 minutes)');
  bullets(s, [
    'Minute 1: Explain brittle automation problem in business terms.',
    'Minute 2–3: Walk through strategy chain and healing loop code.',
    'Minute 4: Show report attachment proving selected strategy.',
    'Minute 5: Connect to CI visibility and release confidence.',
    'Close: Ask for support to standardize this pattern across squads.',
  ]);

  const close = pptx.addSlide();
  close.background = { color: C.primary };
  close.addText('Q&A', {
    x: 0.5, y: 2.1, w: 12.2, h: 1,
    fontFace: 'Arial', fontSize: 40, bold: true, color: 'FFFFFF', align: 'center',
  });
  close.addText('Self-Healing Playwright Framework • Stepwise walkthrough', {
    x: 0.5, y: 3.3, w: 12.2, h: 0.6,
    fontFace: 'Arial', fontSize: 14, color: 'CBD5E0', align: 'center',
  });

  await pptx.writeFile({ fileName: outPath });
  console.log('Wrote:', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
