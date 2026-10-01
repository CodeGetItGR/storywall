export const COLLABORATIONS_HASH_ROOT = '#collaborations';

export function isCollaborationsHash(hash: string): boolean {
    return hash === COLLABORATIONS_HASH_ROOT || hash.startsWith(`${COLLABORATIONS_HASH_ROOT}/`);
}

// `#collaborations/<id>` selects a partner; the bare root selects none.
export function parseCollaborationsHash(hash: string): string | null {
    if (!isCollaborationsHash(hash)) return null;
    const rest = hash.slice(COLLABORATIONS_HASH_ROOT.length + 1);
    if (!rest) return null;
    try {
        return decodeURIComponent(rest);
    } catch {
        // A malformed escape is treated like no selection, so the section falls back to the first partner.
        return null;
    }
}

export function formatCollaborationsHash(collaboratorId: string | null): string {
    return collaboratorId ? `${COLLABORATIONS_HASH_ROOT}/${encodeURIComponent(collaboratorId)}` : COLLABORATIONS_HASH_ROOT;
}
