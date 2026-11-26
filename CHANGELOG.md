# Changelog

## 1.1.0

- Added multi-monitor blanking targets: all, primary, external, and selected monitors.
- Per-monitor blanking uses black overlays so window layouts are preserved; global DPMS is engaged only when all monitors are covered.
- Added configurable automatic blanking after N minutes of inactivity, using Mutter's idle monitor.
- Redesigned preferences with an Adwaita layout, packaged logo, banner, grouped controls, and monitor selection rows.
- Added a real project logo to the repository and release package.

## 1.0.0

- Initial release.
- Quick Settings tile, top-bar indicator, configurable keyboard shortcut.
- Optional system power menu integration.
- Native D-Bus blanking via `org.gnome.ScreenSaver.SetActive`.
- Optional lock mode and hard-DPMS mode.
- GNOME Shell 51 support.
