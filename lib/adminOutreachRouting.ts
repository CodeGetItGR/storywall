export const OUTREACH_HASH_ROOT = '#outreach';

export function isOutreachHash(hash: string): boolean {
    return hash === OUTREACH_HASH_ROOT || hash.startsWith(`${OUTREACH_HASH_ROOT}/`);
}

// `#outreach/<id>` opens that business in the drawer; the bare root is the list.
export function parseOutreachHash(hash: string): string | null {
    if (!isOutreachHash(hash)) return null;
    const rest = hash.slice(OUTREACH_HASH_ROOT.length + 1);
    if (!rest) return null;
    try {
        return decodeURIComponent(rest);
    } catch {
        return null;
    }
}

export function formatOutreachHash(prospectId: string | null): string {
    return prospectId ? `${OUTREACH_HASH_ROOT}/${encodeURIComponent(prospectId)}` : OUTREACH_HASH_ROOT;
}
