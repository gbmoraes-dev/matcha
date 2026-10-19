.PHONY: help all app dev down clean logs ps

help: ## List the available targets
	@awk 'BEGIN {FS = ":.*## "} /^[a-z-]+:.*## / {printf "  %-12s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

all: ## Start the infra and wait until it is healthy
	docker compose up --build -d --wait
	docker compose run --rm rustfs-init

app: all ## Start the infra and the application (production images)
	docker compose --profile app up --build -d --wait

dev: all ## Start the infra and the application with hot reload
	docker compose -f compose.yml -f compose.dev.yml --profile app up --build -d --wait

down: ## Stop the infra, keeping the data
	docker compose --profile app down

clean: ## Stop the infra and wipe all volumes
	docker compose --profile app down -v --remove-orphans

logs: ## Follow the infra logs
	docker compose --profile app logs -f

ps: ## Show the infra services and their health
	docker compose --profile app ps
