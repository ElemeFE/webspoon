clean:
	@rm -rf dist

copy:
	@mkdir -p dist
	@cp -r src/* dist

usemin:
	@../bin/usemin.js dist/test.html

build: clean copy usemin
