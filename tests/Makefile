default: update build

update:
	@cd .. && npm run prepublish

build: clean copy pack usemin rev

clean:
	@rm -rf dist

copy:
	@mkdir -p dist
	@cp -r src/* dist

usemin:
	@../bin/usemin.js dist/*.html

pack:
	@../bin/pack.js '**/webspoon.html' -regexp '^src' -replacement 'xxx' > dist/webspoon.html.js

rev:
	@../bin/rev.js -base 'dist/test5.html' -base 'dist/dist5.js' -static 'dist/dist5.js'
