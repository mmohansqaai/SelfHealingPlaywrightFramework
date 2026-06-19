#!/usr/bin/env node
/**
 * Extract FULL agentic platform monorepo → dist-packages/agentic-platform
 * Single source of truth: healing + autonomous + maintenance + Nova + multi-framework adapters.
 * GitHub: https://github.com/mmohansqaai/agentic-platform
 *
 * Slim slices (publish-only, no duplicate dev):
 *   - extract-healing-platform-repo.mjs  → healing-only customers
 *   - extract-healing-sdk-repo.mjs       → npm SDK standalone
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = join(ROOT, 'dist-packages', 'agentic-platform');

const COPY_DIRS = [
  'packages',
  'agents',
  'services',
  'examples',
  'core',
  'docs',
  'scripts',
  'tests',
  'pages',
  '.github',
];

const COPY_FILES = [
  'playwright.config.ts',
  'playwright.phase2.config.ts',
  'playwright.phase3.config.ts',
  '.gitignore',
];

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  'dist',
  'dist-packages',
  'test-results',
  'playwright-report',
  'blob-report',
  '.git',
]);

function shouldSkip(relPath) {
  if (!relPath) return false;
  const parts = relPath.split('/');
  return parts.some((p) => SKIP_DIR_NAMES.has(p));
}

function copyFiltered(src, dest) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, {
    recursive: true,
    filter: (p) => {
      const rel = p.slice(src.length + 1);
      if (!rel) return true;
      return !shouldSkip(rel);
    },
  });
}

function writeRootPackageJson() {
  const src = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  return {
    ...src,
    name: 'agentic-platform',
    description:
      'Modular monorepo — multi-framework self-healing + autonomous QA + maintenance (SaaS-ready)',
    repository: {
      type: 'git',
      url: 'git+https://github.com/mmohansqaai/agentic-platform.git',
    },
    homepage: 'https://github.com/mmohansqaai/agentic-platform#readme',
    bugs: { url: 'https://github.com/mmohansqaai/agentic-platform/issues' },
    scripts: {
      ...src.scripts,
      'extract:agentic-platform-repo': 'node scripts/extract-agentic-platform-repo.mjs',
      'publish:agentic-platform-github': 'bash scripts/publish-agentic-platform-github.sh',
      'extract:healing-platform-repo': 'node scripts/extract-healing-platform-repo.mjs',
      'publish:healing-platform-github': 'bash scripts/publish-healing-platform-github.sh',
      'extract:healing-sdk-repo': 'node scripts/extract-healing-sdk-repo.mjs',
      'publish:healing-sdk-github': 'bash scripts/publish-healing-sdk-github.sh',
      'publish:all-slices-github': 'npm run publish:agentic-platform-github && npm run publish:healing-platform-github && npm run publish:healing-sdk-github',
    },
  };
}

function writeReadme() {
  return `# agentic-platform

**Single source of truth** — modular monorepo for agentic test automation (SaaS-ready).

One clone. Healing + autonomous QA + maintenance. Multi-framework adapters. Publish slim slices to npm/GitHub when needed.

## Architecture

\`\`\`
packages/ai-healing-core      ← Contracts + HealingDriver (SaaS API)
packages/ai-healing-agent     ← Shared local agent loop
packages/ai-healing-sdk       ← Playwright adapter
packages/ai-healing-cypress   ← Cypress adapter
packages/ai-healing-selenium  ← Selenium JS adapter
packages/ai-healing-java      ← Selenium Java client
packages/autonomous-qa-sdk    ← Goal-driven tests + maintenance
services/healing-service      ← POST /heal + POST /autonomous/plan
agents/*                      ← Locator, LLM, autonomous planner
examples/nova-retail-qa       ← Full reference app (148+ tests)
examples/playwright-plug-and-play ← Minimal healing demo
\`\`\`

## Quick start

\`\`\`bash
npm install
npm run build:healing-service
npm run healing-service                    # http://localhost:3921

# Healing only (plug-and-play)
npm run test:plug-and-play

# Full autonomous Nova suite
npm run install:nova-retail-qa
npm run nova -- test:autonomous-login

# Unit tests
npm run test:unit
\`\`\`

## Publish slices (optional — for external customers)

| Command | Target |
|---------|--------|
| \`npm run publish:agentic-platform-github\` | **This full repo** (source of truth) |
| \`npm run publish:healing-platform-github\` | Slim healing-only mirror |
| \`npm run publish:healing-sdk-github\` | Standalone Playwright SDK repo |

Develop here. Publish slices — never maintain duplicate codebases.

## Docs

- [CTO / AI Director brief](docs/CTO-AI-Director-Agentic-Healing-Brief.md)
- [Agentic healing setup](docs/agentic-healing-setup.md)
- [How to use](docs/How-To-Use-Agentic-Healing.md)

## GitHub repos

| Repo | Role |
|------|------|
| [agentic-platform](https://github.com/mmohansqaai/agentic-platform) | **Mega monorepo (this)** |
| [agentic-healing-platform](https://github.com/mmohansqaai/agentic-healing-platform) | Healing-only publish slice |
| [ai-healing-sdk](https://github.com/mmohansqaai/ai-healing-sdk) | npm SDK publish slice |
`;
}

function writeCiYml() {
  return `name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run test:unit

  plug-and-play:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:plug-and-play:ci

  java-client:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
          cache: maven
      - run: mvn -q -f packages/ai-healing-java/pom.xml package

  autonomous-smoke:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build:autonomous-qa-sdk && npm run build:autonomous-test-agent
      - run: npx playwright install --with-deps chromium
      - run: npm run install:nova-retail-qa
      - run: npm run nova -- test:autonomous-ci-smoke
        env:
          AUTO_HEAL_DISCOVER: '1'
`;
}

function main() {
  console.log(`Extracting agentic-platform (full monorepo) → ${OUT}`);
  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  for (const rel of COPY_DIRS) {
    const src = join(ROOT, rel);
    if (!existsSync(src)) continue;
    copyFiltered(src, join(OUT, rel));
  }

  for (const f of COPY_FILES) {
    const src = join(ROOT, f);
    if (existsSync(src)) cpSync(src, join(OUT, f));
  }

  writeFileSync(join(OUT, 'package.json'), `${JSON.stringify(writeRootPackageJson(), null, 2)}\n`);
  writeFileSync(join(OUT, 'README.md'), writeReadme());
  writeFileSync(join(OUT, '.github', 'workflows', 'ci.yml'), writeCiYml());

  console.log('Done.');
}

main();
