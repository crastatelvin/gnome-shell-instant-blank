// SPDX-License-Identifier: GPL-3.0-or-later

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

/**
 * Per-monitor blanking.
 *
 * Mutter only exposes a global PowerSaveMode, so blanking a subset of
 * monitors is done with black overlay actors sized to each monitor's
 * geometry. The global DPMS mode is changed only when every connected
 * monitor is covered, and is restored on wake.
 */
export class BlankOverlays {
    constructor(screenSaver, onWake) {
        this._screenSaver = screenSaver;
        this._onWake = onWake;
        this._overlays = [];
        this._weBlankedPower = false;
        this._allMonitors = [];
    }

    get active() {
        return this._overlays.length > 0;
    }

    activate(targets, allMonitors) {
        if (this.active || Main.sessionMode.isLocked || targets.length === 0)
            return;

        this._allMonitors = allMonitors;

        for (const monitor of targets) {
            const overlay = new St.Widget({
                reactive: true,
                can_focus: true,
                x: monitor.x,
                y: monitor.y,
                width: monitor.width,
                height: monitor.height,
                style: 'background-color: #000000;',
            });

            overlay.connect('button-press-event', () => {
                this.clear();
                return Clutter.EVENT_STOP;
            });
            overlay.connect('key-press-event', () => {
                this.clear();
                return Clutter.EVENT_STOP;
            });

            Main.uiGroup.add_child(overlay);
            Main.uiGroup.set_child_above_sibling(overlay, null);
            this._overlays.push(overlay);
        }

        global.stage.set_key_focus(this._overlays[0]);

        if (targets.length === this._allMonitors.length) {
            this._weBlankedPower = true;
            this._screenSaver.setPowerSaveMode(3).catch(error =>
                console.error(`[InstantBlank] DPMS off failed: ${error.message}`));
        }
    }

    clear() {
        const wasActive = this.active;

        for (const overlay of this._overlays)
            overlay.destroy();
        this._overlays = [];

        if (this._weBlankedPower) {
            this._weBlankedPower = false;
            this._screenSaver.setPowerSaveMode(0).catch(error =>
                console.error(`[InstantBlank] DPMS restore failed: ${error.message}`));
        }

        if (wasActive)
            this._onWake?.();
    }
}
