# Nova Retail QA

Fully **isolated** from `ai-healing-sdk`. This package is the Nova Retail demo app test suite: page objects, traceability matrix, healing showcases on Nova, and autonomous/maintenance CI.

| Piece | Package / path |
|-------|----------------|
| Self-healing (any app) | [`ai-healing-sdk`](../../packages/ai-healing-sdk) |
| Autonomous runner | [`autonomous-qa-sdk`](../../packages/autonomous-qa-sdk) |
| Nova app + tests | **this folder** |

## Setup

```bash
# from monorepo root
npm run install:nova-retail-qa
```

## Run

```bash
cd examples/nova-retail-qa

npm run test:autonomous-login
npm run test:autonomous-ci-smoke
npm run test:healing-showcases
npm run test:traceability
npm run test:unit
```

Or from root: `npm run nova -- test:autonomous-login`

## Locator targets

Nova page-object mappings live in `src/nova-locator-targets.ts` and register via `global-setup.ts` — not inside `ai-healing-sdk` or generic `autonomous-qa-sdk`.
