# Matcha

Bun monorepo. The backend lives in `apps/backend` (Bun, Elysia, Zod).

## Requirements

- [Bun](https://bun.sh) 1.4.2 (pinned in `packageManager` in `package.json`).
- [Docker](https://docs.docker.com/get-docker/) with Compose v2, and `make`, for the local infrastructure.

## Project structure

```
apps/backend/        # Elysia API (src/http, src/utils, src/env.ts)
docs/                # project subject and documents
.github/             # CI workflows and Dependabot
compose.yml          # local infra: Postgres, Redis, RabbitMQ, RustFS
Makefile             # infra entrypoint (make help)
.env.example         # variables read by compose.yml
biome.json           # lint + format config (whole repo)
tsconfig.base.json   # shared TypeScript config
lefthook.yml         # git hooks
```

## Getting started

```sh
bun install                                       # installs dependencies and the git hooks (Lefthook)
cp .env.example .env                              # fill in the infra values
cp apps/backend/.env.example apps/backend/.env    # fill in the backend values
make all                                          # starts the infra and waits until it is healthy
bun run backend:dev                               # starts the backend; GET http://localhost:3333/healthz
```

## Local infrastructure

`compose.yml` runs everything the backend depends on. Each service has a named volume and a healthcheck, and the host ports come from the root `.env`.

| Service | Container port | Host port variable | URL |
| --- | --- | --- | --- |
| Postgres | 5432 | `POSTGRES_PORT` | |
| Redis | 6379 | `REDIS_PORT` | |
| RabbitMQ (AMQP) | 5672 | `RABBITMQ_PORT` | |
| RabbitMQ management UI | 15672 | `RABBITMQ_MANAGEMENT_PORT` | `http://localhost:<port>` |
| RustFS (S3 API) | 9000 | `RUSTFS_PORT` | `http://localhost:<port>` |
| RustFS console | 9001 | `RUSTFS_CONSOLE_PORT` | `http://localhost:<port>` |

`make all` also runs the one-shot `rustfs-init` job, which creates the bucket (`BUCKET_NAME`) if it does not exist. It is safe to run again.

| Command | What it does |
| --- | --- |
| `make help` | Lists the targets |
| `make all` | Starts the infra, waits until every service is healthy and creates the bucket |
| `make down` | Stops the infra, keeping the data |
| `make clean` | Stops the infra and wipes all volumes (clean state) |
| `make logs` | Follows the logs |
| `make ps` | Shows the services and their health |

### Environment variables

There are two env files, both ignored by git:

- `.env` at the repo root, read by `compose.yml`. It has the user, password and database the containers are created with, the host ports, the RustFS keys and the bucket name.
- `apps/backend/.env`, read by the backend. Its connection values must match the root `.env` (user, password, database, ports, bucket, access and secret keys).

An empty value is not the same as an unset one: remove the lines you don't want to set. An invalid or missing required value makes the app fail at boot with the Zod error.

| Variable | Values | Default |
| --- | --- | --- |
| `NAME` | any string | `application` |
| `ENVIRONMENT` | `development`, `production`, `test` | `development` |
| `LOG_LEVEL` | `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent` | `info` |
| `HOSTNAME` | any string | `0.0.0.0` |
| `PORT` | 0 to 65535 | `3333` |
| `DATABASE_URL` | Postgres URL | required |
| `CACHE_URL` | Redis URL | required |
| `BROKER_URL` | AMQP URL | required |
| `BUCKET_URL` | S3 endpoint URL (`http` or `https`) | required |
| `BUCKET_NAME` | any string | required |
| `BUCKET_ACCESS_KEY` | RustFS access key | required |
| `BUCKET_SECRET_KEY` | RustFS secret key | required |

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
