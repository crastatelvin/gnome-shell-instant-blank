// SPDX-License-Identifier: GPL-3.0-or-later

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

/**
 * Describes the monitors currently known to the Shell. Geometry comes from
 * the Shell layout manager; names and connector data come from Mutter's
 * monitor manager when available (GNOME 49+).
 */
export class MonitorInfo {
    constructor() {
        this._list = [];
    }

    refresh() {
        const geometry = Main.layoutManager.monitors ?? [];
        const manager = global.backend?.get_monitor_manager?.();
        let meta = [];

        if (manager?.get_monitors) {
            try {
                meta = manager.get_monitors().map(monitor => ({
                    connector: monitor.get_connector?.() ?? null,
                    displayName: monitor.get_display_name?.() ?? null,
                    isBuiltin: !!monitor.is_builtin?.(),
                    isPrimary: !!monitor.is_primary?.(),
                }));
            } catch (error) {
                console.warn(`[InstantBlank] Could not read monitor metadata: ${error.message}`);
            }
        }

        this._list = geometry.map((rect, index) => {
            const info = meta[index] ?? {};
            return {
                index,
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                connector: info.connector ?? `monitor-${index}`,
                displayName: info.displayName ?? `Display ${index + 1}`,
                isBuiltin: info.isBuiltin ?? false,
                isPrimary: info.isPrimary ?? index === Main.layoutManager.primaryIndex,
            };
        });

        return this._list;
    }

    get list() {
        return this._list;
    }

    /** Compact strings consumed by the preferences page. */
    toSettings() {
        return this._list.map(monitor => [
            monitor.connector,
            monitor.displayName,
            monitor.isBuiltin ? 'builtin' : 'external',
            monitor.isPrimary ? 'primary' : 'secondary',
        ].join('|'));
    }
}

export function selectMonitors(monitors, target, connectors) {
    switch (target) {
    case 'primary':
        return monitors.filter(monitor => monitor.isPrimary);
    case 'external':
        return monitors.filter(monitor => !monitor.isBuiltin);
    case 'selected':
        return monitors.filter(monitor => connectors.includes(monitor.connector));
    case 'all':
    default:
        return monitors;
    }
}
