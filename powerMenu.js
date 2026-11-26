// SPDX-License-Identifier: GPL-3.0-or-later

import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

/**
 * Optional integration with GNOME Shell's system (power) menu.
 *
 * This deliberately lives in its own module: it touches underscore-private
 * Shell objects, so it is off by default and degrades silently if the
 * internal layout changes in a future Shell release.
 */
export class PowerMenuIntegration {
    constructor(label, callback) {
        this._label = label;
        this._callback = callback;
        this._attempts = 0;
        this._timeoutId = null;
        this._item = null;
        this._menu = null;
        this._destroyed = false;
    }

    enable() {
        // Shell builds the quick settings indicators asynchronously, so the
        // system menu does not exist yet when enable() runs.
        this._timeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, 1, () => this._tryAdd());
    }

    _tryAdd() {
        if (this._destroyed)
            return GLib.SOURCE_REMOVE;

        this._attempts++;
        if (this._attempts > 30) {
            console.warn('[InstantBlank] Power menu not available; skipping');
            this._timeoutId = null;
            return GLib.SOURCE_REMOVE;
        }

        const quickSettings = Main.panel.statusArea.quickSettings;
        const menu = quickSettings?._system?._systemItem?.menu;

        if (!menu || typeof menu.addMenuItem !== 'function')
            return GLib.SOURCE_CONTINUE;

        this._menu = menu;
        this._item = new PopupMenu.PopupMenuItem(this._label);
        this._item.connect('activate', () => this._callback());
        menu.addMenuItem(this._item, 0);

        this._timeoutId = null;
        return GLib.SOURCE_REMOVE;
    }

    disable() {
        this._destroyed = true;

        if (this._timeoutId !== null) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }

        if (this._item) {
            this._item.destroy();
            this._item = null;
        }

        this._menu = null;
        this._callback = null;
    }
}
