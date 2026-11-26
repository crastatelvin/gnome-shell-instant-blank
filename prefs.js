// SPDX-License-Identifier: GPL-3.0-or-later

import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk?version=4.0';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';

import {ExtensionPreferences, gettext as _} from
    'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class InstantBlankPrefs extends ExtensionPreferences {
    get _targets() {
        return [
            {id: 'all', label: _('All monitors')},
            {id: 'primary', label: _('Primary monitor only')},
            {id: 'external', label: _('External monitors only')},
            {id: 'selected', label: _('Selected monitors')},
        ];
    }

    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window._settings = settings;
        window.set_default_size(720, 820);

        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'preferences-system-symbolic',
            description: _('Blank your display instantly, on your terms.'),
        });
        window.add(page);

        const banner = new Adw.Banner({
            title: _('Move the mouse or press a key to wake the display.'),
            button_label: _('Dismiss'),
        });
        banner.connect('button-clicked', () => {
            banner.revealed = false;
        });
        page.set_banner(banner);
        banner.revealed = true;

        const introGroup = new Adw.PreferencesGroup();
        page.add(introGroup);
        introGroup.add(this._buildHeroRow(window));

        page.add(this._buildTriggersGroup(settings));
        page.add(this._buildAutoGroup(settings));
        const displayGroup = this._buildDisplayGroup(settings);
        page.add(displayGroup);
        page.add(this._buildBehaviorGroup(settings));
        page.add(this._buildAboutGroup(window));

        this._monitorSettingsChangedId = settings.connect(
            'changed::monitor-info', () => this._refreshMonitorRows(
                settings, displayGroup));
        window.connect('close-request', () => {
            if (this._monitorSettingsChangedId)
                settings.disconnect(this._monitorSettingsChangedId);
            this._monitorSettingsChangedId = 0;
        });
        this._refreshMonitorRows(settings, displayGroup);
    }

    _buildHeroRow(window) {
        const row = new Adw.ActionRow({
            title: this.metadata.name,
            subtitle: _('Version %s · GPL-3.0-or-later').replace(
                '%s', this.metadata['version-name'] ?? _('1.1.0')),
        });

        const logo = this._buildLogo();
        logo.set_margin_end(12);
        row.add_prefix(logo);

        const button = new Gtk.Button({
            icon_name: 'help-about-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: _('About this extension'),
        });
        button.connect('clicked', () => this._showAbout(window));
        row.add_suffix(button);
        row.set_activatable_widget(button);
        return row;
    }

    _buildLogo() {
        const path = GLib.build_filenamev([this.path, 'logo.svg']);
        try {
            return new Gtk.Picture({
                paintable: Gdk.Texture.new_from_filename(path),
                content_fit: Gtk.ContentFit.CONTAIN,
                width_request: 56,
                height_request: 56,
                alternative_text: _('Instant Blank Screen logo'),
            });
        } catch (error) {
            return new Gtk.Image({
                icon_name: 'video-display-symbolic',
                pixel_size: 48,
            });
        }
    }

    _buildTriggersGroup(settings) {
        const group = new Adw.PreferencesGroup({
            title: _('Quick triggers'),
            description: _('Choose how you want to blank the screen.'),
        });

        this._addSwitch(group, settings, 'show-quick-setting',
            _('Quick Settings tile'),
            _('Add a Blank Screen tile to the Quick Settings menu.'));
        this._addSwitch(group, settings, 'show-panel-icon',
            _('Top bar icon'),
            _('Show the indicator icon in the top status bar.'));
        this._addSwitch(group, settings, 'show-power-menu-item',
            _('System power menu item'),
            _('Uses private Shell internals and may need updating after a GNOME release.'));

        const current = settings.get_strv('blank-shortcut')[0] ?? '';
        const shortcut = new Adw.EntryRow({
            title: _('Keyboard shortcut'),
            text: current,
        });
        shortcut.connect('changed', () => {
            const text = shortcut.get_text().trim();
            const [valid] = Gtk.accelerator_parse(text);
            if (!text) {
                shortcut.remove_css_class('error');
                settings.set_strv('blank-shortcut', []);
            } else if (valid) {
                shortcut.remove_css_class('error');
                settings.set_strv('blank-shortcut', [text]);
            } else {
                shortcut.add_css_class('error');
            }
        });
        group.add(shortcut);
        return group;
    }

    _buildAutoGroup(settings) {
        const group = new Adw.PreferencesGroup({
            title: _('Automatic blanking'),
            description: _('The timer resets whenever you use the mouse or keyboard.'),
        });

        const delay = new Adw.SpinRow({
            title: _('Blank after'),
            subtitle: _('Minutes of inactivity. Set to 0 to disable.'),
            digits: 0,
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 1440,
                step_increment: 1,
                page_increment: 5,
                value: settings.get_uint('auto-blank-delay'),
            }),
        });
        delay.connect('notify::value', () => {
            const value = Math.round(delay.get_value());
            if (value !== settings.get_uint('auto-blank-delay'))
                settings.set_uint('auto-blank-delay', value);
        });
        group.add(delay);

        const info = new Adw.ActionRow({
            title: _('Uses GNOME idle detection'),
            subtitle: _('Videos and games do not reset this timer unless they inhibit idle.'),
            icon_name: 'dialog-information-symbolic',
        });
        group.add(info);
        return group;
    }

    _buildDisplayGroup(settings) {
        const group = new Adw.PreferencesGroup({
            title: _('Displays'),
            description: _('Choose which screens the blank action covers. Individual monitors use a black overlay, so your windows and layout stay untouched.'),
        });

        const targets = this._targets;
        const model = new Gtk.StringList();
        targets.forEach(target => model.append(target.label));
        const combo = new Adw.ComboRow({
            title: _('Blank target'),
            subtitle: _('All monitors uses the GNOME screen shield.'),
            model,
        });
        const currentId = settings.get_string('blank-target');
        combo.set_selected(Math.max(0, targets.findIndex(t => t.id === currentId)));
        combo.connect('notify::selected', () => {
            const target = targets[combo.get_selected()];
            if (target && target.id !== settings.get_string('blank-target'))
                settings.set_string('blank-target', target.id);
        });
        group.add(combo);

        const selected = new Adw.ExpanderRow({
            title: _('Selected monitors'),
            subtitle: _('Only used when "Selected monitors" is the blank target.'),
        });
        group.add(selected);
        group._selectedRow = selected;
        group._monitorRows = [];
        return group;
    }

    _refreshMonitorRows(settings, group) {
        const row = group._selectedRow;
        if (!row)
            return;

        for (const child of group._monitorRows ?? [])
            row.remove(child);
        group._monitorRows = [];

        const monitors = settings.get_strv('monitor-info');
        if (monitors.length === 0) {
            const empty = new Adw.ActionRow({
                title: _('No monitors detected'),
                subtitle: _('They will appear here after the next Shell restart.'),
            });
            row.add_row(empty);
            group._monitorRows.push(empty);
            return;
        }

        const selected = settings.get_strv('target-connectors');
        for (const entry of monitors) {
            const [connector, name, builtin, primary] = entry.split('|');
            const monitorRow = new Adw.SwitchRow({
                title: name || connector,
                subtitle: [
                    builtin === 'builtin' ? _('Built-in') : _('External'),
                    primary === 'primary' ? _('Primary') : null,
                    connector,
                ].filter(Boolean).join(' · '),
                active: selected.includes(connector),
            });
            monitorRow.connect('notify::active', () => {
                const current = settings.get_strv('target-connectors');
                const next = monitorRow.active
                    ? [...new Set([...current, connector])]
                    : current.filter(item => item !== connector);
                if (next.length !== current.length)
                    settings.set_strv('target-connectors', next);
            });
            row.add_row(monitorRow);
            group._monitorRows.push(monitorRow);
        }
    }

    _buildBehaviorGroup(settings) {
        const group = new Adw.PreferencesGroup({
            title: _('Behavior'),
        });
        this._addSwitch(group, settings, 'lock-instead',
            _('Lock instead of blank'),
            _('Show the lock screen instead of only turning the display off.'));

        const advanced = new Adw.ExpanderRow({
            title: _('Advanced'),
            subtitle: _('Options most people should leave alone.'),
        });
        const hardDpms = new Adw.SwitchRow({
            title: _('Hard DPMS mode'),
            subtitle: _('Drive display power directly. Input may not wake the screen; use the shortcut again.'),
        });
        settings.bind('hard-dpms-mode', hardDpms, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        advanced.add_row(hardDpms);
        group.add(advanced);
        return group;
    }

    _buildAboutGroup(window) {
        const group = new Adw.PreferencesGroup({title: _('About')});
        const row = new Adw.ActionRow({title: _('Source and support')});
        const link = new Gtk.LinkButton({
            label: _('GitHub'),
            uri: this.metadata.url,
            valign: Gtk.Align.CENTER,
        });
        row.add_suffix(link);
        group.add(row);

        const license = new Adw.ActionRow({
            title: _('License'),
            subtitle: _('GPL-3.0-or-later'),
            icon_name: 'license-symbolic',
        });
        group.add(license);
        return group;
    }

    _showAbout(window) {
        const dialog = new Adw.AboutDialog({
            application_name: this.metadata.name,
            version: this.metadata['version-name'] ?? _('1.1.0'),
            developer_name: _('crastatelvin'),
            website: this.metadata.url,
            license_type: Gtk.License.GPL_3_0,
            comments: _('Instantly blank one or all monitors from GNOME Shell.'),
        });
        dialog.present(window);
    }

    _addSwitch(group, settings, key, title, subtitle) {
        const row = new Adw.SwitchRow({title, subtitle});
        settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(row);
        return row;
    }
}
