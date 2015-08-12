clean:
	@rm -rf dist

copy:
	@mkdir -p dist
	@cp -r src/* dist

usemin:
	@../bin/usemin.js dist/*.html

build: clean copy usemin
