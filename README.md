# Instant Blank Screen

<p align="center">
  <img src="logo.svg" alt="Instant Blank Screen logo" width="128" height="128">
</p>

A polished GNOME Shell extension that turns the display off **instantly**, on demand — and can do it automatically after a configurable period of inactivity.

It is the proper, open-source replacement for the old trick of adding a `gdbus … SetActive true` custom command to another extension. No subprocesses, no `xset`, no bundled binaries — just native D-Bus and Shell APIs.

## Features

- **Quick Settings tile** — "Blank Screen" in the Quick Settings grid.
- **Top bar indicator** — a display icon next to the system status area.
- **Keyboard shortcut** — configurable, e.g. `<Super>b`.
- **Power-menu item** — optional integration with GNOME's system menu.
- **Multi-monitor targets** — blank all monitors, the primary monitor, external monitors only, or a selected subset.
- **Automatic blanking** — blank after N minutes of inactivity; the timer resets on real mouse/keyboard input.
- **Wakes on input** — move the mouse or press a key to restore the screen.
- **No lock by default** — unless you enable *Lock instead of blank*.
- **Hard DPMS mode** — advanced option that drives Mutter's `PowerSaveMode` directly.

The extension does **not** change `idle-delay`, `lock-enabled`, or any other global GNOME setting. Automatic blanking here is independent of GNOME's own screen blanking.

## How multi-monitor blanking works

GNOME/Mutter exposes only a **global** `PowerSaveMode`; there is no supported per-monitor DPMS API on Wayland. Therefore:

- **All monitors** uses GNOME's screen shield (`org.gnome.ScreenSaver.SetActive`), which covers every monitor and triggers global DPMS-off.
- **Primary / external / selected** uses black overlay actors sized to each target monitor's geometry. Your windows and display layout remain untouched. Global DPMS is engaged only when every connected monitor is covered, and is restored on wake.

Monitor names and connectors are read from Mutter and shown in Preferences, so you can pick exactly which screens to blank.

## How automatic blanking works

The extension uses Mutter's idle monitor via `global.backend.get_core_idle_monitor()` with `add_idle_watch()` and `add_user_active_watch()`. This is the same mechanism GNOME Shell itself uses, so the countdown resets automatically on real input — unlike a plain wall-clock timer. Set the delay to `0` to disable it.

## Installation

### From extensions.gnome.org

Search for **Instant Blank Screen** on [extensions.gnome.org](https://extensions.gnome.org/) and use the switch.

### From source

```bash
git clone https://github.com/crastatelvin/gnome-shell-instant-blank.git
cd gnome-shell-instant-blank
make install
gnome-extensions enable instant-blank@crastatelvin.github.io
```

Open preferences with:

```bash
gnome-extensions prefs instant-blank@crastatelvin.github.io
```

## Compatibility

- GNOME Shell **51** (initial releases). The APIs used are unchanged since GNOME 45; wider support will be declared after testing on those releases.

## Building a release ZIP

```bash
make check
make build
```

`make check` validates `metadata.json`, checks JavaScript syntax and compiles the GSettings schema. `make build` produces `dist/instant-blank@crastatelvin.github.io.shell-extension.zip` with translations, the logo and the schema XML included, and no build scripts or compiled schemas in the package.

## Translations

Translations use gettext. The template is `po/instant-blank@crastatelvin.github.io.pot`. To add a language:

```bash
cp po/instant-blank@crastatelvin.github.io.pot po/fr.po
# fill in fr.po, then:
make build
```

## License

GPL-3.0-or-later. See [COPYING](COPYING).

Contributions are welcome — open an issue or a pull request on GitHub.
