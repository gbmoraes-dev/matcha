# Matcha

Bun monorepo. The backend lives in `apps/backend` (Bun, Elysia, Zod).

## Requirements

- [Bun](https://bun.sh) 1.4.2 (pinned in `packageManager` in `package.json`).

## Project structure

```
apps/backend/        # Elysia API (src/http, src/utils, src/env.ts)
docs/                # project subject and documents
.github/             # CI workflows and Dependabot
biome.json           # lint + format config (whole repo)
tsconfig.base.json   # shared TypeScript config
lefthook.yml         # git hooks
```

## Getting started

```sh
bun install          # installs dependencies and the git hooks (Lefthook)
bun run backend:dev  # starts the backend; GET http://localhost:3333/healthz
```

### Environment variables

Copy `apps/backend/.env.example` to `apps/backend/.env.local` and fill in the values you want to change (remove the ones you don't, an empty value is not the same as an unset one). Every variable has a default. An invalid value makes the app fail at boot with the Zod error.

| Variable | Values | Default |
| --- | --- | --- |
| `NAME` | any string | `application` |
| `ENVIRONMENT` | `development`, `production`, `test` | `development` |
| `LOG_LEVEL` | `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent` | `info` |
| `HOSTNAME` | any string | `0.0.0.0` |
| `PORT` | 0 to 65535 | `3333` |

### Health check

`GET /healthz` returns `200` with `{ "status": "available", "uptime": <seconds> }`.

## Scripts

Run from the repo root.

| Script | What it does |
| --- | --- |
| `bun run backend:dev` | Backend with watch mode and pretty logs |
| `bun run build` | Compiles the backend into a standalone binary (`apps/backend/server`) |
| `bun run start` | Runs the compiled binary (run `bun run build` first; JSON logs outside development) |
| `bun run lint` | Biome lint + format check |
| `bun run format` | Biome lint + format, writing the safe fixes |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run test` | `bun test` |

## Git hooks

- `pre-commit`: Biome on staged files (check only, fix with `bun run format`) and typecheck.
- `pre-push`: tests.

## Branches

Work happens on feature branches and goes into `development` through a pull request. `main` receives changes from `development`. Both branches are targets of the CI.

## CI

CI runs only on `pull_request` targeting `development` or `main`. A new push to the PR cancels the previous run. There is one workflow per area, each with a final aggregate job that is the required check:

- `backend.yml` (check `backend`): runs when `apps/backend/**` changes. lint (biome, typecheck, audit) and test, then build.
- `root.yml` (check `root`): runs when root config changes (`package.json`, `bun.lock`, `biome.json`, `tsconfig.base.json`, `lefthook.yml`). Biome on the whole repo, plus typecheck, tests and build of every app. Also lints the workflows (`actionlint`, `zizmor`) when anything in `.github/` changes.

Each workflow always runs and skips its jobs when nothing relevant changed, so the check stays green instead of pending.

If `bun audit` fails the `backend` check because of a new advisory, run `bun audit fix` (add `--latest` if the fix is outside the pinned range) and commit the updated `bun.lock`.

## Dependabot

`.github/dependabot.yml` opens weekly pull requests for GitHub Actions and Bun dependencies. Minor and patch updates are grouped into one PR each, and only versions published at least 7 days ago are proposed.
