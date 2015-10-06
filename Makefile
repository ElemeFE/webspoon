default: test

test:
	@cd tests && make

build:
	@npm run prepublish

watch:
	@./bin/watch.js -target 'src' -exec 'make build'
