.PHONY: help all infra app dev down clean logs ps

help: ## List the available targets
	@awk 'BEGIN {FS = ":.*## "} /^[a-z-]+:.*## / {printf "  %-12s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

infra:
	docker compose up --build -d --wait
	docker compose run --rm rustfs-init

all: infra ## Start the infra, wait until it is healthy and apply the migrations
	bun run backend:db:migrate
	@if [ -f apps/backend/.env.test ]; then \
		bun --filter @matcha/backend pretest; \
	else \
		echo "apps/backend/.env.test not found: skipping the test database migrations"; \
	fi

app: infra ## Start the infra and the application (production images)
	docker compose --profile app up --build -d --wait

dev: infra ## Start the infra and the application with hot reload
	docker compose -f compose.yml -f compose.dev.yml --profile app up --build -d --wait

down: ## Stop the infra, keeping the data
	docker compose --profile app down

clean: ## Stop the infra and wipe all volumes
	docker compose --profile app down -v --remove-orphans

logs: ## Follow the infra logs
	docker compose --profile app logs -f

ps: ## Show the infra services and their health
	docker compose --profile app ps
