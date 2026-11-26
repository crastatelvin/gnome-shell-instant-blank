# Instant Blank Screen

A small GNOME Shell extension that turns the display off **instantly**, on demand.

It is the proper, open-source replacement for the old trick of adding a
`gdbus … org.gnome.ScreenSaver.SetActive true` custom command to another
extension. No subprocesses, no `xset`, no bundled binaries — just one D-Bus
call through GJS.

## Features

- **Quick Settings tile** — "Blank Screen" in the Quick Settings grid.
- **Top bar indicator** — a display icon next to the system status area.
- **Keyboard shortcut** — configurable (for example `<Super>b`).
- **Power menu item** — optional integration with GNOME's system menu.
- **Wakes on input** — moving the mouse or pressing a key restores the screen.
- **No lock by default** — unless you enable *Lock instead of blank*.
- **Hard DPMS mode** — advanced option that drives Mutter's `PowerSaveMode`
  directly, for systems where the screensaver route is not wanted.

The extension does **not** change `idle-delay`, `lock-enabled`, or any other
global GNOME setting. Automatic blanking remains whatever you configured;
this extension only adds an on-demand action.

## How it works

The default action calls:

```text
org.gnome.ScreenSaver.SetActive(true)   (session bus)
```

On GNOME Wayland sessions this drives Mutter's `PowerSaveMode` from `0` to `3`
(full display-off) and GNOME's own activity watch wakes the screen again.
Because the extension makes a native D-Bus call, it works with no external
command available, and the toggle stays in sync with the real screen state via
the `ActiveChanged` signal.

The optional hard-DPMS mode calls `Set("PowerSaveMode", 3)` on
`org.gnome.Mutter.DisplayConfig` instead. In that mode input may **not** wake
the display, so press the shortcut or the tile again to restore it.

## Installation

### From extensions.gnome.org

Search for **Instant Blank Screen** on
[extensions.gnome.org](https://extensions.gnome.org/) and use the switch.

### From source

```bash
git clone https://github.com/crastatelvin/gnome-shell-instant-blank.git
cd gnome-shell-instant-blank/instant-blank@crastatelvin.github.io
make install
gnome-extensions enable instant-blank@crastatelvin.github.io
```

Open the preferences with:

```bash
gnome-extensions prefs instant-blank@crastatelvin.github.io
```

## Compatibility

- GNOME Shell **51** (initial release). The APIs used are unchanged since
  GNOME 45; wider support will be declared after testing on those releases.

## Building a release ZIP

```bash
make check
make build
```

`make check` validates `metadata.json`, checks JavaScript syntax and compiles
the GSettings schema. `make build` produces
`dist/instant-blank@crastatelvin.github.io.shell-extension.zip` using
`gnome-extensions pack`, with translations and the schema XML included and no
build scripts or compiled schemas in the package.

## Translations

Translations use gettext. The template is in
`po/instant-blank@crastatelvin.github.io.pot`. To add a language:

```bash
cp po/instant-blank@crastatelvin.github.io.pot po/fr.po
# fill in fr.po, then:
make build
```

`gnome-extensions pack` compiles `.po` files into `.mo` automatically.

## License

GPL-3.0-or-later. See [COPYING](COPYING).

Contributions are welcome — open an issue or a pull request on GitHub.
