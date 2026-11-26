// SPDX-License-Identifier: GPL-3.0-or-later

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from
    'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class InstantBlankPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window._settings = settings;

        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'preferences-system-symbolic',
        });
        window.add(page);

        const uiGroup = new Adw.PreferencesGroup({
            title: _('Where to show it'),
            description: _('Choose how you want to trigger the blank screen.'),
        });
        page.add(uiGroup);

        this._addSwitch(uiGroup, settings, 'show-quick-setting',
            _('Quick Settings tile'),
            _('Add a Blank Screen tile to the Quick Settings menu.'));
        this._addSwitch(uiGroup, settings, 'show-panel-icon',
            _('Top bar icon'),
            _('Show the indicator icon in the top status bar.'));
        this._addSwitch(uiGroup, settings, 'show-power-menu-item',
            _('System power menu item'),
            _('Also add it to the power menu. Uses private Shell internals and may break after an update.'));

        const shortcutRow = new Adw.ActionRow({
            title: _('Keyboard shortcut'),
            subtitle: _('For example: <Super>b. Leave empty to disable.'),
        });
        const entry = new Gtk.Entry({
            text: settings.get_strv('blank-shortcut')[0] ?? '',
            placeholder_text: '<Super>b',
            valign: Gtk.Align.CENTER,
        });
        entry.set_size_request(180, -1);
        entry.connect('changed', () => {
            const text = entry.get_text().trim();
            const [valid] = Gtk.accelerator_parse(text);
            if (!text) {
                entry.remove_css_class('error');
                settings.set_strv('blank-shortcut', []);
            } else if (valid) {
                entry.remove_css_class('error');
                settings.set_strv('blank-shortcut', [text]);
            } else {
                entry.add_css_class('error');
            }
        });
        entry.connect('activate', () => {
            if (entry.has_css_class('error'))
                entry.set_text(settings.get_strv('blank-shortcut')[0] ?? '');
        });
        shortcutRow.add_suffix(entry);
        shortcutRow.activatable_widget = entry;
        uiGroup.add(shortcutRow);

        const behaviorGroup = new Adw.PreferencesGroup({
            title: _('Behavior'),
            description: _('By default the screen blanks without locking and wakes on mouse or keyboard input.'),
        });
        page.add(behaviorGroup);

        this._addSwitch(behaviorGroup, settings, 'lock-instead',
            _('Lock instead of blank'),
            _('Show the lock screen instead of only turning the display off.'));
        this._addSwitch(behaviorGroup, settings, 'hard-dpms-mode',
            _('Hard DPMS mode (advanced)'),
            _('Turn the display off at the hardware level. Mouse or keyboard input may not wake it; use the shortcut or tile again.'));

        const aboutGroup = new Adw.PreferencesGroup({
            title: _('About'),
            description: _('Instant Blank Screen is free software licensed under GPL-3.0-or-later.'),
        });
        page.add(aboutGroup);

        const linkRow = new Adw.ActionRow({
            title: _('Source code and issues'),
        });
        const link = new Gtk.LinkButton({
            label: _('GitHub'),
            uri: 'https://github.com/crastatelvin/gnome-shell-instant-blank',
            valign: Gtk.Align.CENTER,
        });
        linkRow.add_suffix(link);
        aboutGroup.add(linkRow);
    }

    _addSwitch(group, settings, key, title, subtitle) {
        const row = new Adw.SwitchRow({title, subtitle});
        settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(row);
        return row;
    }
}
