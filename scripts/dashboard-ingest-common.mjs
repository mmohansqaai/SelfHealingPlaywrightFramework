/**
 * Shared: parse Playwright JSON report → dashboard ingest payload (same shape as payload.json for curl -F).
 */
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

export function mapStatus(playwrightStatus) {
  switch (playwrightStatus) {
    case 'passed':
      return 'PASSED'
    case 'failed':
    case 'timedOut':
    case 'interrupted':
      return 'FAILED'
    case 'skipped':
      return 'SKIPPED'
    default:
      return 'FAILED'
  }
}

function emitTestCasesFromTest(t, titlePath, file, out) {
  const last = (t.results && t.results[0]) || {}
  const status = mapStatus(last.status || 'failed')
  const durationMs = Math.round(Number(last.duration) || 0)
  const name =
    titlePath.length > 0 ? `${titlePath.join(' › ')} › ${t.title}` : t.title
  const module = file
    ? basename(file).replace(/\.(spec|test)\.[tj]s$/, '')
    : 'Playwright'
  out.push({ name, module, status, duration_ms: durationMs })
}

export function collectFromSuite(suite, titlePath, fileHint, out) {
  const file = suite.file || fileHint
  const nextPath = suite.title ? [...titlePath, suite.title] : titlePath
  for (const spec of suite.specs || []) {
    for (const t of spec.tests || []) {
      emitTestCasesFromTest(t, nextPath, file, out)
    }
  }
  for (const t of suite.tests || []) {
    emitTestCasesFromTest(t, nextPath, file, out)
  }
  for (const s of suite.suites || []) {
    collectFromSuite(s, nextPath, file, out)
  }
}

/**
 * @param {string} reportJsonPath - path to Playwright results.json
 * @returns {object} payload: suite_name, environment, build_version, test_cases
 */
export function buildDashboardPayload(reportJsonPath) {
  const raw = readFileSync(reportJsonPath, 'utf8')
  const report = JSON.parse(raw)
  const testCases = []
  for (const root of report.suites || []) {
    collectFromSuite(root, [], root.file || '', testCases)
  }
  if (testCases.length === 0) {
    console.warn(
      '[dashboard] Parsed 0 tests from JSON. Expected suite.specs[].tests[] or suite.tests[]. ' +
        'Ensure playwright.config.ts includes e.g. ["json",{outputFile:"playwright-report/results.json"}].',
    )
  }
  return {
    suite_name: process.env.SUITE_NAME || 'Playwright CI',
    environment: process.env.ENVIRONMENT || 'CI',
    build_version:
      process.env.BUILD_VERSION ||
      process.env.GITHUB_SHA ||
      process.env.GITHUB_REF_NAME ||
      'local',
    test_cases: testCases,
  }
}
