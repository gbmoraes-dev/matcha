FROM oven/bun:1.4.2-alpine AS base

WORKDIR /app

FROM base AS deps

COPY package.json bun.lock ./

COPY apps/backend/package.json apps/backend/

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --ignore-scripts

FROM deps AS build

WORKDIR /app/apps/backend

COPY apps/backend .

RUN bun run build

FROM deps AS dev-api

WORKDIR /app/apps/backend

COPY apps/backend/tsconfig.json ./

ENV ENVIRONMENT=development

CMD ["bun", "--watch", "src/http/server.ts"]

FROM deps AS dev-worker

WORKDIR /app/apps/backend

COPY apps/backend/tsconfig.json ./

ENV ENVIRONMENT=development

CMD ["bun", "--watch", "src/worker/subscriber.ts"]

FROM alpine:3.22 AS runtime

RUN apk add --no-cache libstdc++ libgcc \
    && addgroup -S -g 10001 nonroot \
    && adduser -S -u 10001 -G nonroot -H -s /sbin/nologin nonroot

WORKDIR /app

ENV ENVIRONMENT=production

COPY --from=build --chown=nonroot:nonroot /app/apps/backend/matcha ./

COPY --chown=nonroot:nonroot apps/backend/src/database/migrations src/database/migrations

USER nonroot

EXPOSE 3333

CMD ["./matcha", "api"]
