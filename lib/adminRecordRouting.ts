// Admin sections whose records open as their own page: `#campaigns` is the list, `#campaigns/new` the
// form for a new one, and `#campaigns/<id>` that record's page.

export const CAMPAIGNS_HASH_ROOT = '#campaigns';
export const NEW_RECORD = 'new';
// `#campaigns/past` is the Campaigns page's Past tab, not a record.
export const CAMPAIGNS_PAST = 'past';

export function isRecordHash(root: string, hash: string): boolean {
    return hash === root || hash.startsWith(`${root}/`);
}

export function parseRecordHash(root: string, hash: string): string | null {
    if (!isRecordHash(root, hash)) return null;
    const rest = hash.slice(root.length + 1);
    if (!rest) return null;
    try {
        return decodeURIComponent(rest);
    } catch {
        return null;
    }
}

export function formatRecordHash(root: string, record: string | null): string {
    return record ? `${root}/${encodeURIComponent(record)}` : root;
}
