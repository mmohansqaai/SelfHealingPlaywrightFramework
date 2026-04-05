#!/usr/bin/env node
/**
 * Reads Playwright JSON report and posts to the dashboard:
 * - Preferred: POST .../api/ingest/github-actions/run-with-report (multipart: payload + report_zip)
 * - Fallback: POST .../api/ingest/github-actions/run (JSON only)
 *
 * Playwright JSON format nests tests under `specs` (suite.specs[].tests[]).
 * Older formats may use suite.tests[] directly — we handle both.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync, existsSync, unlinkSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const dashboardUrl = (process.env.DASHBOARD_URL || '').replace(/\/$/, '')
const token = process.env.DASHBOARD_INGEST_TOKEN || ''
const reportPath = process.argv.find((a) => !a.startsWith('-') && a.endsWith('.json'))
const timeoutMs = Number(process.env.DASHBOARD_FETCH_TIMEOUT_MS || 180000)
const maxAttempts = Math.max(1, Number(process.env.DASHBOARD_POST_RETRIES || 4))
const retryDelayMs = Number(process.env.DASHBOARD_POST_RETRY_DELAY_MS || 8000)

/** When set to 1/true, only POST JSON to /run (no zip). */
const jsonOnly =
  process.env.DASHBOARD_JSON_ONLY === '1' ||
  process.env.DASHBOARD_JSON_ONLY === 'true' ||
  process.argv.includes('--json-only')

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function mapStatus(playwrightStatus) {
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

function collectFromSuite(suite, titlePath, fileHint, out) {
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

function shouldRetryHttp(status) {
  return status === 502 || status === 503 || status === 504
}

async function postIngestJson(url, body) {
  const signal =
    typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(timeoutMs)
      : undefined
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Ingest-Token': token,
    },
    body: JSON.stringify(body),
    signal,
  })
  const text = await res.text()
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}: ${text}`)
    err.status = res.status
    throw err
  }
  return text
}

const PATH_RUN_WITH_REPORT = '/api/ingest/github-actions/run-with-report'
const PATH_RUN_JSON = '/api/ingest/github-actions/run'

/**
 * Multipart: fields `payload` (JSON) and `report_zip` (file) — names must match API.
 * Do not set Content-Type — fetch sets multipart boundary.
 */
async function postIngestMultipart(url, body, zipPath) {
  const signal =
    typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(timeoutMs)
      : undefined
  const zipBuf = readFileSync(zipPath)
  const form = new FormData()
  form.append('payload', new Blob([JSON.stringify(body)], { type: 'application/json' }))
  form.append('report_zip', new Blob([zipBuf]), 'playwright-report.zip')

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Ingest-Token': token,
    },
    body: form,
    signal,
  })
  const text = await res.text()
  const zipBytesHeader =
    res.headers.get('x-ingest-report-zip-bytes') ||
    res.headers.get('X-Ingest-Report-Zip-Bytes') ||
    ''
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}: ${text}`)
    err.status = res.status
    throw err
  }
  return { text, status: res.status, zipBytesHeader }
}

function assertUrlEndsWith(url, suffix, label) {
  const ok = url.endsWith(suffix)
  if (!ok) {
    console.warn(`[dashboard] WARNING: ${label} URL should end with ${suffix}, got: ${url}`)
  }
  return ok
}

/**
 * CI log: what to verify in "Publish results" (multipart / run-with-report).
 */
function logMultipartPreflight(url, zipPath, testCaseCount) {
  const zipSize = statSync(zipPath).size
  assertUrlEndsWith(url, PATH_RUN_WITH_REPORT, 'run-with-report')
  console.log('')
  console.log('[dashboard] ========== Publish results (multipart) — check this log ==========')
  console.log(`[dashboard] Node: POST (fetch) multipart`)
  console.log(`[dashboard] URL (must end with ${PATH_RUN_WITH_REPORT}):`)
  console.log(`[dashboard]   ${url}`)
  console.log(`[dashboard] Form fields (exact names): "payload" (JSON) + "report_zip" (file)`)
  console.log(
    `[dashboard] curl equivalent (token redacted): curl -sS -X POST "${url}" -H "X-Ingest-Token: ***" -F "payload=@payload.json;type=application/json" -F "report_zip=@${zipPath}"`,
  )
  console.log(`[dashboard]   (equivalent: -F "report_zip=@.../playwright-report.zip" — field name must be report_zip)`)
  console.log(`[dashboard] Zip path: ${zipPath} (${zipSize} bytes), test cases in payload: ${testCaseCount}`)
  console.log('[dashboard] ================================================================')
  console.log('')
}

function logIngestResponseSuccess(text, zipBytesHeader, mode) {
  console.log(`[dashboard] HTTP response body (${mode}):`)
  console.log(text)
  if (zipBytesHeader !== undefined) {
    if (zipBytesHeader === null || zipBytesHeader === '') {
      console.log('[dashboard] Response header X-Ingest-Report-Zip-Bytes: (not sent by server)')
    } else {
      const n = Number(zipBytesHeader)
      console.log(
        `[dashboard] Response header X-Ingest-Report-Zip-Bytes: ${zipBytesHeader}` +
          (Number.isFinite(n) && n > 0 ? ' (OK: > 0 when zip stored)' : ' (optional; expect > 0 if API sets it)'),
      )
    }
  } else {
    console.log('[dashboard] X-Ingest-Report-Zip-Bytes: N/A (JSON-only /run — no multipart)')
  }
  try {
    const j = JSON.parse(text)
    if (Object.prototype.hasOwnProperty.call(j, 'has_html_report_zip')) {
      if (j.has_html_report_zip === true) {
        console.log('[dashboard] ✓ Response JSON includes "has_html_report_zip": true (zip upload recognized)')
      } else {
        console.warn(
          `[dashboard] ⚠ Response JSON has "has_html_report_zip": ${JSON.stringify(j.has_html_report_zip)} — expected true after successful zip ingest`,
        )
      }
    } else {
      console.log(
        '[dashboard] Note: response JSON has no "has_html_report_zip" key — API may still be OK; confirm GET /api/summary on dashboard',
      )
    }
  } catch {
    console.log('[dashboard] Response was not JSON; skip has_html_report_zip check')
  }
}

async function postWithRetriesJson(url, body, opts = {}) {
  const { label = 'JSON-only /run' } = opts
  let lastErr
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt === 1) {
        assertUrlEndsWith(url, PATH_RUN_JSON, 'run')
        console.log('')
        console.log(`[dashboard] ========== ${label} ==========`)
        console.log(`[dashboard] URL (must end with ${PATH_RUN_JSON}): ${url}`)
        console.log('[dashboard] No multipart — metrics only; HTML zip requires run-with-report')
        console.log('[dashboard] =========================================')
        console.log('')
      }
      return await postIngestJson(url, body)
    } catch (e) {
      lastErr = e
      const aborted =
        e.name === 'AbortError' ||
        e.name === 'TimeoutError' ||
        (e.cause && String(e.cause).includes('aborted'))
      const httpRetry = e.status && shouldRetryHttp(e.status)
      const canRetry = attempt < maxAttempts && (aborted || httpRetry)
      console.warn(
        `[dashboard] JSON POST attempt ${attempt}/${maxAttempts} failed: ${e.message || e} ` +
          `(timeout ${timeoutMs}ms per attempt, ${body.test_cases?.length ?? 0} test case(s))`,
      )
      if (!canRetry) {
        throw e
      }
      console.warn(
        `[dashboard] Retrying in ${retryDelayMs}ms (Render cold starts on free tier can exceed one timeout).`,
      )
      await sleep(retryDelayMs)
    }
  }
  throw lastErr
}

async function postWithRetriesMultipart(url, body, zipPath) {
  let lastErr
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt === 1) {
        logMultipartPreflight(url, zipPath, body.test_cases?.length ?? 0)
      }
      return await postIngestMultipart(url, body, zipPath)
    } catch (e) {
      lastErr = e
      const aborted =
        e.name === 'AbortError' ||
        e.name === 'TimeoutError' ||
        (e.cause && String(e.cause).includes('aborted'))
      const httpRetry = e.status && shouldRetryHttp(e.status)
      const canRetry = attempt < maxAttempts && (aborted || httpRetry)
      console.warn(`[dashboard] multipart POST attempt ${attempt}/${maxAttempts} failed: ${e.message || e}`)
      if (!canRetry) {
        throw e
      }
      console.warn(`[dashboard] Retrying in ${retryDelayMs}ms`)
      await sleep(retryDelayMs)
    }
  }
  throw lastErr
}

/**
 * Zip directory contents into zipOutPath (requires `zip` on PATH — e.g. Ubuntu CI).
 */
function zipReportDirectory(reportDirAbs, zipOutPath) {
  execFileSync('zip', ['-r', '-q', zipOutPath, '.'], {
    cwd: reportDirAbs,
    stdio: 'pipe',
  })
}

async function main() {
  if (!reportPath) {
    console.error('Usage: node playwright-report-to-dashboard.mjs <report.json> [--json-only]')
    process.exit(1)
  }
  if (!dashboardUrl) {
    console.error('Missing DASHBOARD_URL')
    process.exit(1)
  }
  if (!token) {
    console.error('Missing DASHBOARD_INGEST_TOKEN')
    process.exit(1)
  }
  let st
  try {
    st = statSync(reportPath)
  } catch {
    console.error(`Report file not found: ${reportPath}`)
    process.exit(1)
  }
  if (!st.isFile() || st.size === 0) {
    console.error(`Report file missing or empty: ${reportPath}`)
    process.exit(1)
  }
  const raw = readFileSync(reportPath, 'utf8')
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
  const body = {
    suite_name: process.env.SUITE_NAME || 'Playwright CI',
    environment: process.env.ENVIRONMENT || 'CI',
    build_version:
      process.env.BUILD_VERSION ||
      process.env.GITHUB_SHA ||
      process.env.GITHUB_REF_NAME ||
      'local',
    test_cases: testCases,
  }

  const reportDirAbs = resolve(dirname(reportPath))
  const htmlIndex = join(reportDirAbs, 'index.html')
  const canZip =
    !jsonOnly &&
    existsSync(reportDirAbs) &&
    statSync(reportDirAbs).isDirectory() &&
    existsSync(htmlIndex)

  const urlWithReport = `${dashboardUrl}${PATH_RUN_WITH_REPORT}`
  const urlJsonOnly = `${dashboardUrl}${PATH_RUN_JSON}`

  if (canZip) {
    const zipPath = join(tmpdir(), `playwright-report-${process.pid}.zip`)
    try {
      zipReportDirectory(reportDirAbs, zipPath)
      const result = await postWithRetriesMultipart(urlWithReport, body, zipPath)
      logIngestResponseSuccess(result.text, result.zipBytesHeader, 'run-with-report')
      return
    } catch (e) {
      console.warn(
        `[dashboard] run-with-report failed (${e.message || e}); falling back to JSON-only POST ${urlJsonOnly}`,
      )
    } finally {
      try {
        unlinkSync(zipPath)
      } catch {
        /* ignore */
      }
    }
  } else if (!jsonOnly) {
    console.warn(
      '[dashboard] Skipping zip (use full playwright-report/ with index.html, or pass --json-only). Falling back to JSON-only ingest.',
    )
  }

  const out = await postWithRetriesJson(urlJsonOnly, body, {
    label: 'Fallback: JSON-only ingest (no HTML zip)',
  })
  logIngestResponseSuccess(out, undefined, 'run')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
