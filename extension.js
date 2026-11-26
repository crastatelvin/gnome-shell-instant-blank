// SPDX-License-Identifier: GPL-3.0-or-later

import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';

import {ScreenSaver} from './dbus.js';
import {PowerMenuIntegration} from './powerMenu.js';

const ICON_NAME = 'video-display-symbolic';
const SHORTCUT_KEY = 'blank-shortcut';

const BlankToggle = GObject.registerClass(
class BlankToggle extends QuickSettings.QuickToggle {
    constructor(callback) {
        super({
            title: _('Blank Screen'),
            subtitle: _('Turn off the display instantly'),
            iconName: ICON_NAME,
            toggleMode: true,
        });
        this._callback = callback;
        this.connect('clicked', () => this._callback?.());
    }
});

export default class InstantBlankExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._cancellable = new Gio.Cancellable();
        this._screenSaver = new ScreenSaver(this._cancellable);
        this._settingsIds = [];
        this._shortcutRegistered = false;

        this._settingsIds.push(
            this._settings.connect('changed::show-quick-setting',
                () => this._rebuildUi()),
            this._settings.connect('changed::show-panel-icon',
                () => this._rebuildUi()),
            this._settings.connect('changed::show-power-menu-item',
                () => this._updatePowerMenu()),
            this._settings.connect(`changed::${SHORTCUT_KEY}`,
                () => this._updateShortcut()));

        this._screenSaver.subscribeActiveChanged(active => {
            if (this._toggle)
                this._toggle.checked = active;
        });
        this._screenSaver.getActive().then(active => {
            if (this._toggle)
                this._toggle.checked = active;
        });

        this._rebuildUi();
        this._updatePowerMenu();
        this._updateShortcut();
    }

    disable() {
        this._destroyUi();

        if (this._powerMenu) {
            this._powerMenu.disable();
            this._powerMenu = null;
        }

        if (this._shortcutRegistered) {
            Main.wm.removeKeybinding(SHORTCUT_KEY);
            this._shortcutRegistered = false;
        }

        for (const id of this._settingsIds)
            this._settings.disconnect(id);
        this._settingsIds = [];

        this._screenSaver?.unsubscribeAll();
        this._cancellable?.cancel();
        this._screenSaver = null;
        this._cancellable = null;
        this._settings = null;
    }

    _rebuildUi() {
        this._destroyUi();

        this._indicator = new QuickSettings.SystemIndicator();
        this._icon = this._indicator._addIndicator();
        this._icon.icon_name = ICON_NAME;
        this._icon.visible = this._settings.get_boolean('show-panel-icon');

        this._toggle = new BlankToggle(() => this._activate());
        if (this._settings.get_boolean('show-quick-setting'))
            this._indicator.quickSettingsItems.push(this._toggle);

        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);

        this._screenSaver.getActive().then(active => {
            if (this._toggle)
                this._toggle.checked = active;
        });
    }

    _destroyUi() {
        if (this._toggle) {
            this._toggle.destroy();
            this._toggle = null;
        }
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        this._icon = null;
    }

    _updatePowerMenu() {
        if (this._powerMenu) {
            this._powerMenu.disable();
            this._powerMenu = null;
        }

        if (!this._settings.get_boolean('show-power-menu-item'))
            return;

        this._powerMenu = new PowerMenuIntegration(
            _('Blank Screen'), () => this._activate());
        this._powerMenu.enable();
    }

    _updateShortcut() {
        if (this._shortcutRegistered) {
            Main.wm.removeKeybinding(SHORTCUT_KEY);
            this._shortcutRegistered = false;
        }

        const accelerators = this._settings.get_strv(SHORTCUT_KEY);
        if (accelerators.length === 0)
            return;

        Main.wm.addKeybinding(
            SHORTCUT_KEY,
            this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.ALL,
            () => this._activate());
        this._shortcutRegistered = true;
    }

    _activate() {
        this._screenSaver.activate({
            lockInstead: this._settings.get_boolean('lock-instead'),
            hardDpms: this._settings.get_boolean('hard-dpms-mode'),
        });
    }
}
