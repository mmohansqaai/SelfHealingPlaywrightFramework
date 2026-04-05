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

/**
 * Multipart: fields `payload` (JSON) and `report_zip` (file).
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
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}: ${text}`)
    err.status = res.status
    throw err
  }
  return text
}

async function postWithRetriesJson(url, body) {
  let lastErr
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
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

  const urlWithReport = `${dashboardUrl}/api/ingest/github-actions/run-with-report`
  const urlJsonOnly = `${dashboardUrl}/api/ingest/github-actions/run`

  if (canZip) {
    const zipPath = join(tmpdir(), `playwright-report-${process.pid}.zip`)
    try {
      zipReportDirectory(reportDirAbs, zipPath)
      console.log(
        `[dashboard] POST ${urlWithReport} (multipart: payload + report_zip, ${testCases.length} test case(s))`,
      )
      const out = await postWithRetriesMultipart(urlWithReport, body, zipPath)
      console.log(out)
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

  console.log(`[dashboard] POST ${urlJsonOnly} (${testCases.length} test case(s))`)
  const out = await postWithRetriesJson(urlJsonOnly, body)
  console.log(out)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
