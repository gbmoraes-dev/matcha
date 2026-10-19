# Matcha

Bun monorepo. The backend lives in `apps/backend` (Bun, Elysia, Zod).

## Requirements

- [Bun](https://bun.sh) 1.4.2 (pinned in `packageManager` in `package.json`).
- [Docker](https://docs.docker.com/get-docker/) with Compose v2, and `make`, for the local infrastructure.

## Project structure

```
apps/backend/        # API, worker and migrator (src/http, src/worker, src/database, src/main.ts) and its Dockerfile
docker/              # Postgres init script (creates the test database)
docs/                # project subject and documents
.github/             # CI workflows and Dependabot
compose.yml          # local infra: Postgres, Redis, RabbitMQ, RustFS (and the app, profile `app`)
compose.dev.yml      # override: the app restarting on every change
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
cp apps/backend/.env.example apps/backend/.env.local   # fill in the backend values (running on the host)
make all                                          # starts the infra and waits until it is healthy
bun run backend:dev:api                           # starts the backend; GET http://localhost:3333/healthz
bun run backend:dev:worker                        # starts the worker (queue consumers), in another terminal
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
| Backend (only with `make app` or `make dev`) | 3333 | `BACKEND_PORT` | `http://localhost:<port>` |

`make all` also runs the one-shot `rustfs-init` job, which creates the bucket (`BUCKET_NAME`) if it does not exist. It is safe to run again.

The first time the Postgres volume is created, `docker/postgres/init.sql` also creates the `matcha_test` database used by the tests.

| Command | What it does |
| --- | --- |
| `make help` | Lists the targets |
| `make all` | Starts the infra, waits until every service is healthy and creates the bucket |
| `make app` | `make all`, then runs the migrations and starts the API and the worker from the production images |
| `make dev` | Like `make app`, with the source mounted and a restart on every change |
| `make down` | Stops the infra and the app, keeping the data |
| `make clean` | Stops the infra and wipes all volumes (clean state) |
| `make logs` | Follows the logs |
| `make ps` | Shows the services and their health |

### Environment variables

There are three env files, all ignored by git (plus `.env.test`, see the tests section):

- `.env` at the repo root, read by `compose.yml`. It has the user, password and database the containers are created with, the host ports (including `BACKEND_PORT`), the RustFS keys and the bucket name.
- `apps/backend/.env.local`, read by the backend when it runs on the host (`bun run backend:dev:api`). Its connection values must match the root `.env` (user, password, database, ports, bucket, access and secret keys) and point to `localhost`.
- `apps/backend/.env`, read by the containers (`make app` and `make dev`). It has the same variables, but the hosts are the compose service names (`postgres`, `redis`, `rabbitmq`, `rustfs`), the container ports (`5432`, `6379`, `5672`, `9000`) and `ENVIRONMENT=production`, which the compiled binary requires (the `make dev` override sets `development` for its own containers).

A variable with a default can be left out. A blank value is not the same as an absent one (a blank `LOG_LEVEL` or `TRUST_PROXY` fails and a blank `PORT` becomes `0`), so remove the line instead of leaving it empty. An invalid or missing required value makes the app fail at boot with the Zod error.

| Variable | Values | Default |
| --- | --- | --- |
| `NAME` | any string | `application` |
| `ENVIRONMENT` | `development`, `production`, `test` | `development` |
| `LOG_LEVEL` | `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent` | `info` |
| `HOSTNAME` | any string | `0.0.0.0` |
| `PORT` | 0 to 65535 | `3333` |
| `ORIGIN` | the one origin allowed by CORS (`http` or `https` URL) | required |
| `TRUST_PROXY` | `true` when the API runs behind exactly one proxy that appends the client address to `x-forwarded-for` (used by the rate limit) | `false` |
| `DATABASE_URL` | Postgres URL | required |
| `CONNECTION_TIMEOUT_MS` | milliseconds to wait for a database connection | `2000` |
| `QUERY_TIMEOUT_MS` | milliseconds before a query or statement is cut | `5000` |
| `CACHE_URL` | Redis URL | required |
| `BROKER_URL` | AMQP URL | required |
| `BUCKET_URL` | S3 endpoint URL (`http` or `https`) | required |
| `BUCKET_NAME` | any string | required |
| `BUCKET_ACCESS_KEY` | RustFS access key | required |
| `BUCKET_SECRET_KEY` | RustFS secret key | required |
| `RESEND_API_KEY` | Resend API key | required |
| `MAIL_FROM` | sender address (a verified domain in production; Resend only allows `onboarding@resend.dev` for tests) | required |

### Health checks

- `GET /healthz` (liveness) returns `200` with `{ "status": "available", "uptime": <seconds> }`. It never touches a dependency, so it stays `200` while Postgres is down.
- `GET /readyz` (readiness) checks the database (`SELECT 1`), the cache (`redis.ping()`), the bucket (`s3.list`, which also validates the credentials) and the broker connection. It returns `200` with `{ "application", "database", "cache", "bucket", "broker" }`, all `available`, or `503` with the failing ones marked `unavailable`. Each check is cut after `CONNECTION_TIMEOUT_MS`. A new dependency adds its own check in `src/http/routes/public/readiness.ts`.

## Docker

`apps/backend/Dockerfile` builds from the repo root (`docker build -f apps/backend/Dockerfile .`) and has these targets:

| Target | What it is |
| --- | --- |
| `runtime` | The production image (the default target): the compiled binary on Alpine, as a non-root user, with `ENVIRONMENT=production`, port `3333` and the SQL in `src/database/migrations` |
| `dev-api`, `dev-worker` | Bun with the dependencies; the source is mounted by `compose.dev.yml` and the process restarts on every change (`bun --watch`) |

There is one image and one binary, `matcha` (`src/main.ts`). Its first argument says what it runs: `./matcha api` (the default `CMD`), `./matcha worker` or `./matcha migrate`; anything else fails. The three processes use the same image and only differ in the command (`command` in compose, `args` in Kubernetes). It carries no Bun and no `node_modules`: `bun build --compile` puts the runtime inside the binary, and it only runs with `ENVIRONMENT=production`, because with `development` the `pino-pretty` transport cannot be resolved inside the binary. The image has about 86 MB on disk and 41 MB compressed.

Migrations are not part of the entrypoint. `./matcha migrate` runs them as their own step, before the API and the worker start (`make app` does it through the `migrate` service). That keeps the worker and several API replicas from migrating at the same time. It runs the `drizzle-orm` migrator, which uses the same `drizzle.__drizzle_migrations` table as `drizzle-kit`, so no `drizzle-kit` and no dependencies are needed in the image. On the host, `bun run backend:db:migrate` still runs `drizzle-kit`, and both can be used on the same database.

`make app` and `make dev` run the `app` profile of `compose.yml`: `migrate`, `backend` (healthcheck on `/healthz`, port `BACKEND_PORT` of the root `.env`) and `worker`, reading `apps/backend/.env`. `make app` runs the real image, so the worker delivers email through Resend with the key in that file.

On every pull request that touches the backend, the `image` job of `backend.yml` builds the image without pushing it, with the GitHub Actions layer cache. The image is not published to a registry yet, because there is no deploy.

## Cache, storage and broker

- **Redis** (`src/cache/index.ts`) and **S3** (`src/storage/index.ts`) use Bun's native `RedisClient` and `S3Client`, with no wrapper: features import `redis` and `s3` and call them directly. The Redis client keeps reconnecting if Redis is down at boot or restarts. Pointing `BUCKET_URL` and the keys at another S3 provider is enough to switch from RustFS.
- **RabbitMQ** (`src/broker/broker.ts`) uses [`rabbitmq-client`](https://github.com/cody-greene/node-rabbitmq-client), which reconnects on its own and sets consumers and publishers up again. Each queue gets a file in `src/broker/channels/` that declares the queue (with a dead-letter exchange) and `<queue>.dlq`, and a dispatch function in `src/broker/messages/`. The API only publishes.

## HTTP conventions

Every route follows the same rules, set up as plugins in `src/http/plugins/` and applied in `src/http/app.ts`.

- **Validation:** body, query and params are Zod schemas passed straight to the route (`body: z.object({...})`).
- **Errors:** every error response has the shape `{ code, message, details? }` (the `error` schema in `plugins/error.ts`). There are no error classes: a route returns the errors it expects with `status(409, { code: 'EMAIL_TAKEN', message: '...' })` and lists them in its `response` schema. The global `onError` (also in `plugins/error.ts`) covers the rest: `422 VALIDATION` with `details` (path and message of each invalid field), `400 BAD_REQUEST` for a body that is not valid JSON, `404 NOT_FOUND` and `500 INTERNAL_SERVER_ERROR`. The 500 has a generic message, never the stack; the real error is logged.
- **Request id:** each request gets an id (UUIDv7), returned in the `x-request-id` header. A route can log with it through `log` in its context (`({ log }) => log.info(...)`), and unexpected errors are logged with it. The id is always generated by the API, an incoming `x-request-id` is ignored.
- **CORS:** `plugins/cors.ts` allows only `ORIGIN`, with credentials.
- **Rate limit:** `rateLimit({ name, max, duration })` (`plugins/rate-limit.ts`) wraps [`elysia-rate-limit`](https://github.com/rayriffy/elysia-rate-limit) with the counters in Redis (`plugins/redis-rate-limit-context.ts`, atomic Lua scripts), so instances share them. Use it on a route group, each with its own limits: `.group('/auth', (g) => g.use(rateLimit({ name: 'auth', max: 5, duration: 60_000 })).post(...))`. Past the limit the response is `429 RATE_LIMITED` with `Retry-After`. The client is identified by its IP. Behind a proxy set `TRUST_PROXY=true`: the key is then the last address of `x-forwarded-for`, the one the proxy added (the earlier ones come from the client). Without it, every client behind the proxy would share one counter. The package is on 4.6.3 because 5.x needs Elysia 2.
- **OpenAPI:** generated from the routes and their Zod schemas. The UI ([Scalar](https://scalar.com)) is at `/docs` and the JSON spec at `/docs/json`. Give each route `detail` (`tags`, `summary`, `operationId`) and a `response` schema per status.

## Worker

`src/worker/subscriber.ts` is a separate process from the same codebase that runs the queue consumers (today, the email queue). The API serves requests without it.

Delivery is at-least-once: a message that was in flight when the worker stopped, for any reason, is delivered again, so consumers must be idempotent. When a consumer throws, the message is rejected without requeue and the dead-letter exchange of the queue moves it to `<queue>.dlq`.

| Script | What it does |
| --- | --- |
| `bun run backend:dev:worker` | Worker with watch mode |
| `bun run backend:start:worker` | Runs the compiled worker (`./matcha worker`) |

## Email

`dispatchEmailRequested({ to, subject, html })` (`src/broker/messages/email-requested.ts`) validates the email, gives it an id and puts it in the `<NAME>.emails` queue, resolving once the broker confirms it; the worker delivers it. The request never waits for the provider, and if the queue is unreachable the promise rejects.

- **Delivery:** the consumer in `src/worker/subscriber.ts` delivers each email. In production it sends through the Resend SDK; in development and test it prints the recipient, subject, body and the links of each email in the worker log, so no real email goes out by accident. It delivers 2 emails at a time, because Resend limits the requests per second.
- **Failures:** if the delivery fails (or the message is not a valid email), the consumer throws and the message is rejected without requeue. The dead-letter exchange of the queue moves it to `<NAME>.emails.dlq`, and the failure is logged. There is no automatic retry: a message in the dead queue is looked at and sent again by hand.
- **Idempotency:** the id is created once and sent to Resend as the idempotency key (Resend remembers it for 24 hours). An email redelivered after a crash is sent once.
- **Templates:** emails are written with [React Email](https://react.email). `src/mailer/templates/layout.tsx` is the base layout; a feature writes its own component inside it, turns it into HTML with `render` from `@react-email/components` and passes the HTML to `dispatchEmailRequested`. Text in the JSX is escaped by React.

### Previewing the templates

`bun run backend:email` starts the React Email preview at http://localhost:3030. It lists every template in `src/mailer/templates` (a file with a default-exported component) and reloads it when you save. A template can export `PreviewProps`, the data it shows in the preview; `verify-account.tsx` is the example. Files with only named exports, like `layout.tsx`, are not listed.

The queue names start with `NAME`, so the tests (another `NAME` in `.env.test`) never touch the development queues.

## Database

The backend talks to Postgres through [Drizzle](https://orm.drizzle.team) and `pg` (node-postgres). The schema lives in `apps/backend/src/database/schema` and the generated migrations in `apps/backend/src/database/migrations` (commit them). The first migration, `enable_extensions`, creates no tables: it enables `cube` and `earthdistance` (distance and radius queries), `pg_trgm` (fuzzy tag search), `unaccent` (accent-insensitive search) and `citext` (case-insensitive username and email). PostGIS is not needed for the proximity requirements.

Drizzle is on the 1.0 release candidate (`1.0.0-rc.4`, pinned): there is no stable 1.0 yet, and `latest` on npm is still 0.x. Two things differ from 0.x: `drizzle()` takes `relations` instead of `schema` (add them in `src/database` when the first tables arrive), and the migration folder uses the new layout (one folder per migration with `migration.sql` and `snapshot.json`).

| Script | What it does |
| --- | --- |
| `bun run backend:db:generate` | Generates a migration from schema changes (add `--custom --name <name>` for a hand-written SQL migration) |
| `bun run backend:db:migrate` | Applies the pending migrations (`drizzle-kit migrate`); safe to run again |
| `bun run backend:db:studio` | Opens Drizzle Studio |

These scripts read `apps/backend/.env.local`. The infra must be up (`make all`).

### Tests with a real database

Tests run against their own database, `matcha_test`, so development data is never touched. `docker/postgres/init.sql` creates it, but only when the Postgres volume is first created. On an existing volume, create it once with `docker compose exec postgres createdb -U <POSTGRES_USER> matcha_test` (or wipe everything with `make clean` and run `make all` again).

`bun test` sets `NODE_ENV=test`, and in that mode Bun does **not** read `.env.local`. Copy `apps/backend/.env.example` to `apps/backend/.env.test` (git-ignored), fill it in like `.env.local`, and make its `DATABASE_URL` point to `matcha_test`. The `test` script loads that file, and `pretest` applies the migrations to the test database before each run. The `pre-push` hook runs the tests, so it needs the infra too.

In CI, the `backend` test job runs the tests against throwaway Postgres, Redis, RabbitMQ and RustFS service containers (a step creates the bucket).

## Scripts

Run from the repo root.

| Script | What it does |
| --- | --- |
| `bun run backend:dev:api` | Backend with watch mode and pretty logs |
| `bun run backend:dev:worker` | Worker (queue consumers) with watch mode |
| `bun run backend:email` | React Email preview of the templates in `src/mailer/templates` (http://localhost:3030) |
| `bun run build` | Compiles the API, the worker and the migrator into one standalone binary (`apps/backend/matcha`) |
| `bun run backend:start:server` | Runs the compiled API (`./matcha api`; run `bun run build` first, with `ENVIRONMENT=production`) |
| `bun run backend:start:worker` | Runs the compiled worker |
| `bun run lint` | Biome lint + format check |
| `bun run format` | Biome lint + format, writing the safe fixes |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run test` | `bun test` (needs the infra and `apps/backend/.env.test`) |

## Git hooks

- `pre-commit`: Biome on staged files (check only, fix with `bun run format`) and typecheck.
- `pre-push`: tests.

## Branches

`main` is the only long-lived branch. Work happens on short-lived feature branches and goes into `main` through a pull request, merged with squash (the PR title becomes the commit message). The `backend` and `root` checks must pass, conversations must be resolved and the branch must be up to date with `main` before merging.

## CI

CI runs only on `pull_request` targeting `main`. A new push to the PR cancels the previous run. There is one workflow per area, each with a final aggregate job that is the required check:

- `backend.yml` (check `backend`): runs when `apps/backend/**`, `.dockerignore` or a shared root file that affects it (`bun.lock`, `package.json`, `tsconfig.base.json`) changes. lint (biome, typecheck, audit) and test, then build; the `image` job builds the Docker image without pushing it.
- `root.yml` (check `root`): runs Biome on the whole repo when `biome.json`, `package.json` or `tsconfig.base.json` change (the app workflows only lint their own folder), and lints the workflows (`actionlint`, `zizmor`) when anything in `.github/` changes. Typecheck, build and tests of the apps stay in each app's workflow, which also runs when a shared root file that affects it changes.

Each workflow always runs and skips its jobs when nothing relevant changed, so the check stays green instead of pending.

If `bun audit` fails the `backend` check because of a new advisory, run `bun audit fix` (add `--latest` if the fix is outside the pinned range) and commit the updated `bun.lock`.

## Dependabot

`.github/dependabot.yml` opens weekly pull requests for GitHub Actions and Bun dependencies. Minor and patch updates are grouped into one PR each, and only versions published at least 7 days ago are proposed.
