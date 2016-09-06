default: update build check

update:
	@cd .. && make build

build: clean copy pack wildcard usemin rev

clean:
	@rm -rf dist

copy:
	@mkdir -p dist
	@cp -r src/* dist

usemin:
	@../bin/usemin.js dist/*.html

pack:
	@../bin/pack.js 'src/**/webspoon.html' -regexp '^src' -replacement 'xxx' > dist/webspoon.html.js

wildcard:
	@../bin/wildcard.js 'dist/**/test7.html'

rev:
	@../bin/rev.js -base 'dist/test5.html' -base 'dist/dist5.js' -static 'dist/dist5.js'

check:
	@open index.html
