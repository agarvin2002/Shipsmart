
SOURCES = service packages

.PHONY: bootstrap clean-all clean-and-update-yarn-lock dev-clean-install docker-up docker-down docker-logs docker-clean docker-ps start dev worker worker-dev

bootstrap:
	yarn install --frozen-lockfile

clean-all:
	rm -rf node_modules
	rm -rf package-lock.json
	rm -f yarn.lock

	$(foreach source, $(SOURCES), \
		$(call clean-source-all, $(source)))

clean-and-update-yarn-lock:
	make clean-all
	touch yarn.lock
	yarn install --mode=update-lockfile

dev-clean-install:
	make clean-and-update-yarn-lock
	make bootstrap

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-clean:
	docker-compose down -v

docker-restart:
	docker-compose restart

docker-ps:
	docker-compose ps

start:
	cd service && yarn start

dev:
	cd service && yarn dev

worker:
	cd service && yarn worker

worker-dev:
	cd service && yarn worker:dev

define clean-source-all
	rm -rf $(1)/*/node_modules
	rm -rf $(1)/*/package-lock.json
endef
