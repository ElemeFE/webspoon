default: test

test:
	@cd tests && make

build:
	@npm run prepublish
