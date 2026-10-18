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

The first time the Postgres volume is created, `docker/postgres/init.sql` also creates the `matcha_test` database used by the tests.

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
| `CONNECTION_TIMEOUT_MS` | milliseconds to wait for a database connection | `2000` |
| `QUERY_TIMEOUT_MS` | milliseconds before a query or statement is cut | `5000` |
| `CACHE_URL` | Redis URL | required |
| `BROKER_URL` | AMQP URL | required |
| `BUCKET_URL` | S3 endpoint URL (`http` or `https`) | required |
| `BUCKET_NAME` | any string | required |
| `BUCKET_ACCESS_KEY` | RustFS access key | required |
| `BUCKET_SECRET_KEY` | RustFS secret key | required |

### Health checks

- `GET /healthz` (liveness) returns `200` with `{ "status": "available", "uptime": <seconds> }`. It never touches a dependency, so it stays `200` while Postgres is down.
- `GET /readyz` (readiness) checks the dependencies (today, the database with a `SELECT 1`) and returns `200` with `{ "application": "available", "database": "available" }`, or `503` with the failing one marked `unavailable`. Each ticket that adds a dependency adds its own check in `src/http/routes/public/readiness.ts`.

## Database

The backend talks to Postgres through [Drizzle](https://orm.drizzle.team) and `pg` (node-postgres). The schema lives in `apps/backend/src/database/schema` and the generated migrations in `apps/backend/src/database/migrations` (commit them). The first migration, `enable_extensions`, creates no tables: it enables `cube` and `earthdistance` (distance and radius queries), `pg_trgm` (fuzzy tag search), `unaccent` (accent-insensitive search) and `citext` (case-insensitive username and email). PostGIS is not needed for the proximity requirements.

Drizzle is on the 1.0 release candidate (`1.0.0-rc.4`, pinned): there is no stable 1.0 yet, and `latest` on npm is still 0.x. Two things differ from 0.x: `drizzle()` takes `relations` instead of `schema` (add them in `src/database` when the first tables arrive), and the migration folder uses the new layout (one folder per migration with `migration.sql` and `snapshot.json`).

| Script | What it does |
| --- | --- |
| `bun run backend:db:generate` | Generates a migration from schema changes (add `--custom --name <name>` for a hand-written SQL migration) |
| `bun run backend:db:migrate` | Applies the pending migrations (`drizzle-kit migrate`); safe to run again |
| `bun run backend:db:studio` | Opens Drizzle Studio |

These scripts read `apps/backend/.env.local`. The infra must be up (`make all`).

> The project subject asks for hand-written queries and defines a micro-framework as one without an ORM. Using Drizzle's query builder is a known risk for the defense.

### Tests with a real database

Tests run against their own database, `matcha_test`, so development data is never touched. `docker/postgres/init.sql` creates it, but only when the Postgres volume is first created. On an existing volume, create it once with `docker compose exec postgres createdb -U <POSTGRES_USER> matcha_test` (or wipe everything with `make clean` and run `make all` again).

`bun test` sets `NODE_ENV=test`, and in that mode Bun does **not** read `.env.local`. Copy `apps/backend/.env.example` to `apps/backend/.env.test` (git-ignored), fill it in like `.env.local`, and make its `DATABASE_URL` point to `matcha_test`. The `test` script loads that file, and `pretest` applies the migrations to the test database before each run. The `pre-push` hook runs the tests, so it needs the infra too.

In CI, the `backend` test job runs the tests against a throwaway Postgres service container.

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
| `bun run test` | `bun test` (needs the infra and `apps/backend/.env.test`) |

## Git hooks

- `pre-commit`: Biome on staged files (check only, fix with `bun run format`) and typecheck.
- `pre-push`: tests.

## Branches

Work happens on feature branches and goes into `development` through a pull request. `main` receives changes from `development`. Both branches are targets of the CI.

## CI

CI runs only on `pull_request` targeting `development` or `main`. A new push to the PR cancels the previous run. There is one workflow per area, each with a final aggregate job that is the required check:

- `backend.yml` (check `backend`): runs when `apps/backend/**` or a shared root file that affects it (`bun.lock`, `package.json`, `tsconfig.base.json`) changes. lint (biome, typecheck, audit) and test, then build.
- `root.yml` (check `root`): runs Biome on the whole repo when `biome.json`, `package.json` or `tsconfig.base.json` change (the app workflows only lint their own folder), and lints the workflows (`actionlint`, `zizmor`) when anything in `.github/` changes. Typecheck, build and tests of the apps stay in each app's workflow, which also runs when a shared root file that affects it changes.

Each workflow always runs and skips its jobs when nothing relevant changed, so the check stays green instead of pending.

If `bun audit` fails the `backend` check because of a new advisory, run `bun audit fix` (add `--latest` if the fix is outside the pinned range) and commit the updated `bun.lock`.

## Dependabot

`.github/dependabot.yml` opens weekly pull requests for GitHub Actions and Bun dependencies. Minor and patch updates are grouped into one PR each, and only versions published at least 7 days ago are proposed.
