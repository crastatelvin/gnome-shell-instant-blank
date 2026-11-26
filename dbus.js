// SPDX-License-Identifier: GPL-3.0-or-later

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const SS_NAME = 'org.gnome.ScreenSaver';
const SS_PATH = '/org/gnome/ScreenSaver';
const SS_IFACE = 'org.gnome.ScreenSaver';

const DC_NAME = 'org.gnome.Mutter.DisplayConfig';
const DC_PATH = '/org/gnome/Mutter/DisplayConfig';
const DC_IFACE = 'org.gnome.Mutter.DisplayConfig';
const PROPS_IFACE = 'org.freedesktop.DBus.Properties';

const POWER_SAVE_OFF = 3;
const POWER_SAVE_ON = 0;

/**
 * Thin, cancellable wrapper around the two session D-Bus services used by
 * this extension. No subprocesses are spawned and no binaries are bundled.
 */
export class ScreenSaver {
    constructor(cancellable) {
        this._cancellable = cancellable;
        this._signalIds = [];
    }

    async getActive() {
        try {
            const result = await Gio.DBus.session.call(
                SS_NAME, SS_PATH, SS_IFACE, 'GetActive',
                null, null, Gio.DBusCallFlags.NONE, -1, this._cancellable);
            return result.deepUnpack()[0];
        } catch (error) {
            this._logError('GetActive', error);
            return false;
        }
    }

    /**
     * Blank (or lock) the display. In hard-DPMS mode this toggles Mutter's
     * PowerSaveMode instead, because that mode does not wake on input.
     */
    async activate({lockInstead = false, hardDpms = false} = {}) {
        if (hardDpms) {
            await this._togglePowerSaveMode();
            return;
        }

        const method = lockInstead ? 'Lock' : 'SetActive';
        const parameters = lockInstead ? null : new GLib.Variant('(b)', [true]);

        try {
            await Gio.DBus.session.call(
                SS_NAME, SS_PATH, SS_IFACE, method, parameters,
                null, Gio.DBusCallFlags.NONE, -1, this._cancellable);
        } catch (error) {
            this._logError(method, error);
        }
    }

    /** Restore the display after a hard-DPMS blank. */
    async wake() {
        await this._setPowerSaveMode(POWER_SAVE_ON);
    }

    async getPowerSaveMode() {
        return this._getPowerSaveMode();
    }

    async setPowerSaveMode(value) {
        await this._setPowerSaveMode(value);
    }

    subscribeActiveChanged(callback) {
        try {
            const id = Gio.DBus.session.signal_subscribe(
                SS_NAME, SS_IFACE, 'ActiveChanged', SS_PATH, null,
                Gio.DBusSignalFlags.NONE,
                (_connection, _sender, _path, _iface, _signal, parameters) => {
                    callback(parameters.deepUnpack()[0]);
                });
            this._signalIds.push(id);
            return id;
        } catch (error) {
            this._logError('signal_subscribe(ActiveChanged)', error);
            return null;
        }
    }

    unsubscribeAll() {
        for (const id of this._signalIds) {
            try {
                Gio.DBus.session.signal_unsubscribe(id);
            } catch (error) {
                this._logError('signal_unsubscribe', error);
            }
        }
        this._signalIds = [];
    }

    async _togglePowerSaveMode() {
        const current = await this._getPowerSaveMode();
        await this._setPowerSaveMode(
            current === POWER_SAVE_OFF ? POWER_SAVE_ON : POWER_SAVE_OFF);
    }

    async _getPowerSaveMode() {
        try {
            const result = await Gio.DBus.session.call(
                DC_NAME, DC_PATH, PROPS_IFACE, 'Get',
                new GLib.Variant('(ss)', [DC_IFACE, 'PowerSaveMode']),
                null, Gio.DBusCallFlags.NONE, -1, this._cancellable);
            return result.deepUnpack()[0].deepUnpack();
        } catch (error) {
            this._logError('Get(PowerSaveMode)', error);
            return POWER_SAVE_ON;
        }
    }

    async _setPowerSaveMode(value) {
        try {
            await Gio.DBus.session.call(
                DC_NAME, DC_PATH, PROPS_IFACE, 'Set',
                new GLib.Variant('(ssv)', [
                    DC_IFACE,
                    'PowerSaveMode',
                    new GLib.Variant('i', value),
                ]),
                null, Gio.DBusCallFlags.NONE, -1, this._cancellable);
        } catch (error) {
            this._logError('Set(PowerSaveMode)', error);
        }
    }

    _logError(method, error) {
        if (this._cancellable?.is_cancelled() &&
            error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
            return;
        console.error(`[InstantBlank] D-Bus ${method} failed: ${error.message}`);
    }
}
