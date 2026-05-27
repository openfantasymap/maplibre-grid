# All tasks run inside Docker (local Node is too old). Override with: make IMAGE=node:22
IMAGE   ?= node:20-alpine
WORKDIR  = /app
DOCKER   = docker run --rm -v "$(CURDIR)":$(WORKDIR) -w $(WORKDIR) $(IMAGE)

.PHONY: install build test typecheck check demo clean publish-placeholder publish-placeholder-dry

install: ## Install dependencies
	$(DOCKER) npm install

build: ## Build the library (ESM + CJS + d.ts) into dist/
	$(DOCKER) npm run build

test: ## Run the unit tests
	$(DOCKER) npm test

typecheck: ## Type-check without emitting
	$(DOCKER) npm run typecheck

check: typecheck test build ## Typecheck, test and build

demo: ## Serve the interactive demo on http://localhost:5173
	docker run --rm -it -p 5173:5173 -v "$(CURDIR)":$(WORKDIR) -w $(WORKDIR) \
		$(IMAGE) npx vite demo --host 0.0.0.0

publish-placeholder-dry: ## Preview the npm-trusted-publish placeholder publish (no token needed)
	$(DOCKER) npx --yes setup-npm-trusted-publish @openfantasymap/maplibre-grid --dry-run

publish-placeholder: ## Publish the placeholder to claim the npm name (requires NPM_TOKEN)
	@if [ -z "$$NPM_TOKEN" ]; then echo "NPM_TOKEN is required: NPM_TOKEN=npm_xxx make publish-placeholder"; exit 2; fi
	docker run --rm -e NPM_TOKEN -v "$(CURDIR)":$(WORKDIR) -w $(WORKDIR) $(IMAGE) \
		npx --yes setup-npm-trusted-publish @openfantasymap/maplibre-grid

clean: ## Remove build output and dependencies
	rm -rf dist node_modules
