default: update build

update:
	@cd .. && npm run prepublish

build: clean copy usemin rev

clean:
	@rm -rf dist

copy:
	@mkdir -p dist
	@cp -r src/* dist

usemin:
	@../bin/usemin.js dist/*.html

rev:
	@../bin/rev.js -base 'dist/test5.html' -base 'dist/dist5.js' -static 'dist/dist5.js'
