/**
 * Executive / board-ready deck with low technical depth.
 * Output: docs/Self-Healing-Executive-Board-Deck.pptx
 */
import pptxgen from 'pptxgenjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'docs', 'Self-Healing-Executive-Board-Deck.pptx');

const C = {
  navy: '1b365d',
  blue: '2f6fb0',
  text: '2d3748',
  muted: '718096',
  bg: 'f7fafc',
};

function title(pptx, t, st) {
  const s = pptx.addSlide();
  s.background = { color: C.navy };
  s.addText(t, {
    x: 0.6, y: 1.9, w: 12.0, h: 1.2,
    fontFace: 'Arial', fontSize: 34, bold: true, color: 'FFFFFF',
  });
  s.addText(st, {
    x: 0.6, y: 3.25, w: 12.0, h: 0.8,
    fontFace: 'Arial', fontSize: 16, color: 'DCE6F2',
  });
  s.addText('Confidential — Board discussion', {
    x: 0.6, y: 5.0, w: 12.0, h: 0.3,
    fontFace: 'Arial', fontSize: 10, color: 'AFC1D9',
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
    fontFace: 'Arial', fontSize: 23, bold: true, color: C.navy,
  });
  if (bullets.length) {
    s.addText(bullets.map((b) => ({ text: b, options: { bullet: true } })), {
      x: 0.7, y: 1.3, w: 12.0, h: 3.9,
      fontFace: 'Arial', fontSize: 15, color: C.text, lineSpacingMultiple: 1.2,
    });
  }
  if (footer) {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.7, y: 5.2, w: 12.0, h: 0.7,
      fill: { color: C.bg }, line: { color: 'D9E2EC', width: 1 },
    });
    s.addText(footer, {
      x: 0.95, y: 5.38, w: 11.5, h: 0.35,
      fontFace: 'Arial', fontSize: 12, bold: true, color: C.muted, align: 'center',
    });
  }
}

async function main() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = 'Self-Healing Automation — Executive Board Deck';
  pptx.author = 'Quality Engineering';

  title(
    pptx,
    'Self-Healing Automation Framework',
    'Board-ready summary: reliability, speed, and governance impact'
  );

  slide(pptx, 'Executive Summary', [
    'We implemented a resilient test framework that adapts to minor UI changes.',
    'Result: fewer false failures, faster issue triage, and stronger release confidence.',
    'The approach is already in use across login, checkout, and core user journeys.',
    'The model is reusable and can be scaled across products with low incremental effort.',
  ]);

  slide(pptx, 'Why This Matters Now', [
    'Digital releases are frequent; brittle test automation creates avoidable delays.',
    'A high share of failed test runs are often automation maintenance issues, not product defects.',
    'Self-healing reduces this noise and lets teams focus on true business risk.',
  ], 'Outcome focus: protect delivery speed without reducing quality standards.');

  slide(pptx, 'Business Value Delivered', [
    'Higher reliability of CI signals (less noise, clearer pass/fail meaning).',
    'Lower maintenance overhead after UI/content changes.',
    'Faster root-cause analysis through richer execution evidence.',
    'Improved trust in automation results for release decisions.',
  ]);

  slide(pptx, 'Current Coverage Snapshot', [
    'Automated suites cover core journeys: authentication, product discovery, cart, checkout, and admin flows.',
    'Traceability suite remains available for broader requirement mapping when needed.',
    'Execution can be tuned for speed (core suite) or depth (traceability mode).',
  ]);

  slide(pptx, 'Governance and Transparency', [
    'Every run produces standardized reports for leadership and engineering review.',
    'Pipeline integrations now support metrics plus report artifacts for end-to-end visibility.',
    'This supports auditability and objective quality trend tracking over time.',
  ]);

  slide(pptx, 'Risk Reduction', [
    'Reduces release risk from automation instability.',
    'Improves detection confidence for customer-impacting regressions.',
    'Supports controlled scaling of automated testing across teams.',
  ], 'Net effect: fewer surprises late in release cycles.');

  slide(pptx, 'Roadmap (Next 2 Quarters)', [
    'Scale adoption across additional modules and product teams.',
    'Expand dashboard-level trend reporting for leadership KPIs.',
    'Introduce governance checkpoints for coverage health and test reliability.',
    'Continue optimizing runtime and signal quality in CI.',
  ]);

  slide(pptx, 'Leadership Decisions Requested', [
    'Endorse this framework as the standard for UI automation resilience.',
    'Support incremental rollout across high-priority product areas.',
    'Align on quality KPIs (stability, execution confidence, release readiness).',
  ], 'Decision ask: scale this as a strategic quality capability.');

  const end = pptx.addSlide();
  end.background = { color: C.navy };
  end.addText('Questions & Discussion', {
    x: 0.6, y: 2.2, w: 12.0, h: 1.0,
    fontFace: 'Arial', fontSize: 38, bold: true, color: 'FFFFFF', align: 'center',
  });
  end.addText('Self-Healing Automation Framework • Board Briefing', {
    x: 0.6, y: 3.5, w: 12.0, h: 0.5,
    fontFace: 'Arial', fontSize: 14, color: 'CBD5E0', align: 'center',
  });

  await pptx.writeFile({ fileName: outPath });
  console.log('Wrote:', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
