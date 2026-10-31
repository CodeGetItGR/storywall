export const PARTNER_APPLICATIONS_HASH_ROOT = '#applications';

export function isPartnerApplicationsHash(hash: string): boolean {
    return hash === PARTNER_APPLICATIONS_HASH_ROOT || hash.startsWith(`${PARTNER_APPLICATIONS_HASH_ROOT}/`);
}

// `#applications/<id>` opens that application's page; the bare root is the list.
export function parsePartnerApplicationsHash(hash: string): string | null {
    if (!isPartnerApplicationsHash(hash)) return null;
    const rest = hash.slice(PARTNER_APPLICATIONS_HASH_ROOT.length + 1);
    if (!rest) return null;
    try {
        return decodeURIComponent(rest);
    } catch {
        return null;
    }
}

export function formatPartnerApplicationsHash(applicationId: string | null): string {
    return applicationId ? `${PARTNER_APPLICATIONS_HASH_ROOT}/${encodeURIComponent(applicationId)}` : PARTNER_APPLICATIONS_HASH_ROOT;
}
