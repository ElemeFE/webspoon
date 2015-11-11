help:
	@echo "# help"
	@echo "$$ [35mmake[0m                            # help"
	@echo "$$ [35mmake clean[0m                      # clear bin/*.js"
	@echo "$$ [35mmake build[0m                      # build src to bin"
	@echo "$$ [35mmake test[0m                       # run test scripts"
	@echo "$$ [35mmake watch[0m                      # watch and build"
	@echo ""

test:
	@cd tests && make

build: $(shell find src -name '*.js' | sed s/^src/bin/)
	@# build done

babel := ./node_modules/.bin/babel
bin/%.js: src/%.js
	@echo "[1mBuild[0m [35m$<[0m to [35m$@[0m ... \c"
	@$(babel) $< > $@
	@chmod 755 $@
	@echo "[32mOK[0m"

clean:
	@rm -rf bin/*

watch:
	@./bin/watch.js -target 'src' \
	  -exec "[ \$$(echo \$$src | grep -v '/\\.' | wc -l) -gt 0 ] || exit" \
	  -exec 'make build'
