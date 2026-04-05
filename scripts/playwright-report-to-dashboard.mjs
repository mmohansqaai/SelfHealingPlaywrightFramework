#!/usr/bin/env node
/**
 * Local helper: same multipart ingest as CI (fetch), no JSON-only fallback.
 * CI should use: build-dashboard-payload.mjs + zip + curl (see .github/workflows/playwright.yml).
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync, existsSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { buildDashboardPayload } from './dashboard-ingest-common.mjs'

const dashboardUrl = (process.env.DASHBOARD_URL || '').replace(/\/$/, '')
const token = process.env.DASHBOARD_INGEST_TOKEN || ''
const reportPath = process.argv.find((a) => !a.startsWith('-') && a.endsWith('.json'))
const timeoutMs = Number(process.env.DASHBOARD_FETCH_TIMEOUT_MS || 180000)

const PATH_RUN_WITH_REPORT = '/api/ingest/github-actions/run-with-report'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function zipReportDirectory(reportDirAbs, zipOutPath) {
  execFileSync('zip', ['-r', '-q', zipOutPath, '.'], {
    cwd: reportDirAbs,
    stdio: 'pipe',
  })
}

async function postMultipart(url, body, zipPath) {
  const signal =
    typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(timeoutMs)
      : undefined
  const zipBuf = readFileSync(zipPath)
  const form = new FormData()
  form.append('payload', new Blob([JSON.stringify(body)], { type: 'application/json' }))
  form.append('report_zip', new Blob([zipBuf]), 'report.zip')

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-Ingest-Token': token },
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
  return { text, zipBytesHeader }
}

function logResponse(text, zipBytesHeader) {
  console.log('[dashboard] Response body:', text)
  if (zipBytesHeader) {
    console.log(`[dashboard] X-Ingest-Report-Zip-Bytes: ${zipBytesHeader}`)
  }
  try {
    const j = JSON.parse(text)
    if (j.has_html_report_zip === true) {
      console.log('[dashboard] ✓ has_html_report_zip: true')
    }
  } catch {
    /* ignore */
  }
}

async function main() {
  if (!reportPath) {
    console.error('Usage: node playwright-report-to-dashboard.mjs <playwright-report/results.json>')
    process.exit(1)
  }
  if (!dashboardUrl || !token) {
    console.error('Set DASHBOARD_URL and DASHBOARD_INGEST_TOKEN')
    process.exit(1)
  }
  if (!statSync(reportPath).isFile()) {
    console.error(`Not a file: ${reportPath}`)
    process.exit(1)
  }

  const body = buildDashboardPayload(reportPath)
  const reportDirAbs = resolve(dirname(reportPath))
  const htmlIndex = join(reportDirAbs, 'index.html')
  if (!existsSync(htmlIndex)) {
    console.error('Missing playwright-report/index.html — cannot zip HTML report')
    process.exit(1)
  }

  const url = `${dashboardUrl}${PATH_RUN_WITH_REPORT}`
  const zipPath = join(tmpdir(), `report-${process.pid}.zip`)
  try {
    zipReportDirectory(reportDirAbs, zipPath)
    writeFileSync('payload.json', JSON.stringify(body, null, 2), 'utf8')
    console.log(`[dashboard] POST ${url} (multipart: payload + report_zip)`)
    console.log(
      `[dashboard] curl: curl -f -sS -X POST "${url}" -H "X-Ingest-Token: ***" -F "payload=@payload.json;type=application/json" -F "report_zip=@${zipPath};type=application/zip"`,
    )

    let lastErr
    const maxAttempts = Math.max(1, Number(process.env.DASHBOARD_POST_RETRIES || 4))
    const delay = Number(process.env.DASHBOARD_POST_RETRY_DELAY_MS || 8000)
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const r = await postMultipart(url, body, zipPath)
        logResponse(r.text, r.zipBytesHeader)
        return
      } catch (e) {
        lastErr = e
        console.warn(`[dashboard] attempt ${attempt}/${maxAttempts}: ${e.message || e}`)
        if (attempt < maxAttempts) await sleep(delay)
      }
    }
    throw lastErr
  } finally {
    try {
      unlinkSync(zipPath)
    } catch {
      /* ignore */
    }
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
