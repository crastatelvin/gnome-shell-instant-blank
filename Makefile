UUID := instant-blank@crastatelvin.github.io
DOMAIN := instant-blank@crastatelvin.github.io
SOURCES := extension.js prefs.js dbus.js powerMenu.js monitors.js overlay.js
ZIP := dist/$(UUID).shell-extension.zip

.PHONY: all build install check pot clean

all: check build

build:
	mkdir -p dist
	gnome-extensions pack --podir=po \
		--extra-source=dbus.js \
		--extra-source=powerMenu.js \
		--extra-source=monitors.js \
		--extra-source=overlay.js \
		--force --out-dir=dist .
	@echo "Built $(ZIP)"

install: build
	gnome-extensions install --force "$(ZIP)"
	@echo "Installed. now run: gnome-extensions enable $(UUID)"

check:
	@python3 -c "import json; json.load(open('metadata.json'))" && echo "metadata.json: OK"
	@for f in $(SOURCES); do \
		node --input-type=module --check < "$$f" || exit 1; \
	done && echo "JS syntax: OK"
	@glib-compile-schemas --strict schemas/ && rm -f schemas/gschemas.compiled && echo "GSettings schema: OK"

pot:
	xgettext --from-code=UTF-8 --keyword=_ --add-comments \
		--output=po/$(DOMAIN).pot $(SOURCES)

clean:
	rm -rf dist schemas/gschemas.compiled
