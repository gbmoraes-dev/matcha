.PHONY: help all down clean logs ps

all: ## Start the infra and wait until it is healthy
	docker compose up --build -d --wait
	docker compose run --rm rustfs-init

help: ## List the available targets
	@awk 'BEGIN {FS = ":.*## "} /^[a-z-]+:.*## / {printf "  %-12s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

down: ## Stop the infra, keeping the data
	docker compose down

clean: ## Stop the infra and wipe all volumes
	docker compose down -v --remove-orphans

logs: ## Follow the infra logs
	docker compose logs -f

ps: ## Show the infra services and their health
	docker compose ps
