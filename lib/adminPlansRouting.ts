export type PlansView =
    | { view: 'eventType'; key: string | null }
    | { view: 'settingsModules'; key: null }
    | { view: 'settingsEventTypes'; key: null };

export const PLANS_HASH_ROOT = '#plans';

const LEGACY_HASHES: Record<string, PlansView> = {
    '#event-plans': { view: 'eventType', key: null },
    '#modules': { view: 'settingsModules', key: null },
    '#event-types': { view: 'settingsEventTypes', key: null },
};

export function isPlansHash(hash: string): boolean {
    return hash === PLANS_HASH_ROOT || hash.startsWith(`${PLANS_HASH_ROOT}/`) || hash in LEGACY_HASHES;
}

export function parsePlansHash(hash: string): PlansView {
    const legacy = LEGACY_HASHES[hash];
    if (legacy) return legacy;
    if (!hash.startsWith(PLANS_HASH_ROOT)) return { view: 'eventType', key: null };
    const rest = hash.slice(PLANS_HASH_ROOT.length).replace(/^\//, '');
    if (!rest) return { view: 'eventType', key: null };
    if (rest === 'settings/modules') return { view: 'settingsModules', key: null };
    if (rest === 'settings/event-types') return { view: 'settingsEventTypes', key: null };
    if (rest.startsWith('settings/')) return { view: 'eventType', key: null };
    return { view: 'eventType', key: decodeURIComponent(rest) };
}

export function formatPlansHash(view: PlansView): string {
    if (view.view === 'settingsModules') return `${PLANS_HASH_ROOT}/settings/modules`;
    if (view.view === 'settingsEventTypes') return `${PLANS_HASH_ROOT}/settings/event-types`;
    return view.key ? `${PLANS_HASH_ROOT}/${encodeURIComponent(view.key)}` : PLANS_HASH_ROOT;
}
