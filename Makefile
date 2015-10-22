default: test

test:
	@cd tests && make

build:
	@npm run prepublish

watch:
	@./bin/watch.js -target 'src' \
	  -exec "[ \$$(echo \$$src | grep -v '/\\.' | wc -l) -gt 0 ] || exit" \
	  -exec 'make build'
