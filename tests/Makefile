default: build clean copy usemin

build:
	@cd .. && npm run prepublish

clean:
	@rm -rf dist

copy:
	@mkdir -p dist
	@cp -r src/* dist

usemin:
	@../bin/usemin.js dist/*.html
