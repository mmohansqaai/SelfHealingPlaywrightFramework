#!/usr/bin/env bash
# Wake Render, then POST multipart ingest (payload.json + report.zip).
# Required for dashboard Action logs. Exits non-zero if ingest does not succeed.
set -euo pipefail

DASHBOARD_URL="${DASHBOARD_URL%/}"
REPORT_DIR="${REPORT_DIR:-examples/playwright-plug-and-play/playwright-report}"
TOKEN="${DASHBOARD_INGEST_TOKEN:-}"
HEALTH_TRIES="${DASHBOARD_HEALTH_TRIES:-24}"
HEALTH_MAX_SEC="${DASHBOARD_HEALTH_MAX_SEC:-20}"
POST_TRIES="${DASHBOARD_POST_RETRIES:-5}"
POST_MAX_SEC="${DASHBOARD_MAX_TIME_SEC:-120}"
POST_DELAY_SEC="${DASHBOARD_POST_RETRY_DELAY_SEC:-12}"

if [ -z "${TOKEN}" ]; then
  echo "[dashboard] DASHBOARD_INGEST_TOKEN is not set — cannot publish Action logs"
  exit 1
fi
if [ ! -f "${REPORT_DIR}/results.json" ] || [ ! -f "${REPORT_DIR}/index.html" ]; then
  echo "[dashboard] Missing ${REPORT_DIR}/results.json or index.html"
  exit 1
fi

wait_for_health() {
  local i http
  echo "[dashboard] Waking API: GET ${DASHBOARD_URL}/api/health"
  for i in $(seq 1 "${HEALTH_TRIES}"); do
    set +e
    http="$(curl --http1.1 -sS -o /tmp/dashboard-health.body -w '%{http_code}' \
      --connect-timeout 10 --max-time "${HEALTH_MAX_SEC}" \
      "${DASHBOARD_URL}/api/health")"
    local curl_exit=$?
    set -e
    if [ "${curl_exit}" -eq 0 ] && [ "${http}" -ge 200 ] && [ "${http}" -lt 300 ]; then
      echo "[dashboard] health OK (HTTP ${http}) on attempt ${i}/${HEALTH_TRIES}"
      cat /tmp/dashboard-health.body 2>/dev/null || true
      echo
      return 0
    fi
    echo "[dashboard] health attempt ${i}/${HEALTH_TRIES}: curl_exit=${curl_exit} http=${http:-000}"
    sleep 5
  done
  echo "[dashboard] API never became healthy. Check Render logs for realtime-testing-dashboard-api."
  return 1
}

wait_for_health

node scripts/build-dashboard-payload.mjs "${REPORT_DIR}/results.json" payload.json
node -e 'const fs=require("node:fs");const p=JSON.parse(fs.readFileSync("payload.json","utf8"));console.log(`[dashboard] payload summary: suite_name="${p.suite_name}", environment="${p.environment}", build_version="${p.build_version}", test_cases=${Array.isArray(p.test_cases)?p.test_cases.length:0}`)'

rm -f report.zip
# HTML + JSON — exclude nested zips/traces that stall Render on upload.
( cd "${REPORT_DIR}" && zip -qr "$(pwd)/../../../report.zip" . -x "*.zip" ) || \
  ( cd "${REPORT_DIR}" && zip -qr "$(pwd)/../../../report.zip" . )
ls -lh report.zip
echo "[dashboard] report.zip $(wc -c < report.zip | tr -d ' ') bytes"

URL="${DASHBOARD_URL}/api/ingest/github-actions/run-with-report"
echo ""
echo "========== Dashboard ingest =========="
echo "POST ${URL}"
echo "======================================"

HDR=$(mktemp)
BODY=$(mktemp)
cleanup() { rm -f "$HDR" "$BODY" /tmp/dashboard-health.body; }
trap cleanup EXIT

attempt=1
while [ "${attempt}" -le "${POST_TRIES}" ]; do
  echo "[dashboard] curl attempt ${attempt}/${POST_TRIES} (max ${POST_MAX_SEC}s)"
  # Re-wake before each upload — free Render may sleep between retries.
  curl --http1.1 -sS -o /dev/null --connect-timeout 10 --max-time "${HEALTH_MAX_SEC}" \
    "${DASHBOARD_URL}/api/health" || true

  set +e
  HTTP_CODE="$(curl --http1.1 -sS --connect-timeout 30 --max-time "${POST_MAX_SEC}" \
    --expect100-timeout 20 \
    -X POST "${URL}" \
    -H "X-Ingest-Token: ${TOKEN}" \
    -D "${HDR}" -o "${BODY}" \
    -F "payload=@payload.json;type=application/json" \
    -F "report_zip=@report.zip;type=application/zip" \
    -w '%{http_code}')"
  CURL_EXIT=$?
  set -e

  if [ "${CURL_EXIT}" -eq 0 ] && [ "${HTTP_CODE}" -ge 200 ] && [ "${HTTP_CODE}" -lt 300 ]; then
    echo "--- Response headers ---"
    cat "${HDR}"
    echo "--- Response body ---"
    cat "${BODY}"
    echo
    if grep -q '"has_html_report_zip"[[:space:]]*:[[:space:]]*true' "${BODY}" 2>/dev/null; then
      echo '[dashboard] OK: has_html_report_zip=true — Action logs should appear on dashboard'
    else
      echo "[dashboard] WARN: 2xx but has_html_report_zip not true — metrics may show without HTML logs"
    fi
    exit 0
  fi

  echo "[dashboard] curl failed (exit ${CURL_EXIT}, http ${HTTP_CODE:-000})"
  if [ -s "${HDR}" ]; then
    echo "--- Failed response headers ---"
    cat "${HDR}"
  fi
  if [ -s "${BODY}" ]; then
    echo "--- Failed response body ---"
    cat "${BODY}"
  fi

  # Metrics fallback so the run still appears if zip upload hangs.
  if [ "${attempt}" -eq 2 ] || [ "${attempt}" -eq 4 ]; then
    echo "[dashboard] fallback POST JSON metrics to /api/ingest/github-actions/run"
    set +e
    FALLBACK_CODE="$(curl --http1.1 -sS --connect-timeout 20 --max-time 60 \
      -X POST "${DASHBOARD_URL}/api/ingest/github-actions/run" \
      -H "X-Ingest-Token: ${TOKEN}" \
      -H "Content-Type: application/json" \
      --data-binary @payload.json \
      -w '%{http_code}' -o /tmp/dashboard-fallback.body)"
    FALLBACK_EXIT=$?
    set -e
    echo "[dashboard] fallback http=${FALLBACK_CODE:-000} exit=${FALLBACK_EXIT}"
    cat /tmp/dashboard-fallback.body 2>/dev/null || true
    echo
  fi

  if [ "${HTTP_CODE:-}" = "401" ] || [ "${HTTP_CODE:-}" = "403" ]; then
    echo "[dashboard] Auth rejected — check DASHBOARD_INGEST_TOKEN"
    exit 1
  fi
  if [ "${attempt}" -lt "${POST_TRIES}" ]; then
    sleep "${POST_DELAY_SEC}"
  fi
  attempt=$((attempt + 1))
done

echo "[dashboard] All ingest attempts failed — dashboard will not show this run's Action logs"
exit 1
