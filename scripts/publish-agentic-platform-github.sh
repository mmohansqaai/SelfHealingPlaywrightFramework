#!/usr/bin/env bash
# Publish FULL agentic-platform monorepo → https://github.com/mmohansqaai/agentic-platform
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_DIR="$ROOT/dist-packages/agentic-platform"

echo "==> Extract full agentic platform monorepo"
node "$ROOT/scripts/extract-agentic-platform-repo.mjs"

cd "$REPO_DIR"
echo "==> npm install"
npm install

echo "==> Build stack (healing-service + autonomous)"
npm run build:healing-service
npm run build:autonomous-qa-sdk
npm run build:autonomous-test-agent

if [ ! -d .git ]; then
  git init -b main
fi

git add .
if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "$(cat <<'EOF'
Release: agentic-platform monorepo (single source of truth).

Healing + autonomous QA + maintenance + multi-framework adapters + Nova reference app.
EOF
)"
fi

GH="${GH:-gh}"
if ! "$GH" auth status >/dev/null 2>&1; then
  echo "Run: gh auth login"
  exit 1
fi

REPO="mmohansqaai/agentic-platform"
if "$GH" repo view "$REPO" >/dev/null 2>&1; then
  echo "==> Remote repo exists — pushing"
  gh auth setup-git
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/${REPO}.git"
  git push -u origin main --force
else
  "$GH" repo create "$REPO" --public --source=. --remote=origin --push \
    --description "Modular monorepo — agentic healing + autonomous QA + maintenance (SaaS-ready)"
fi

echo ""
echo "Done: https://github.com/${REPO}"
