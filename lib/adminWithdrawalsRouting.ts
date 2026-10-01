export const WITHDRAWALS_HASH_ROOT = '#withdrawals';

export function isWithdrawalsHash(hash: string): boolean {
    return hash === WITHDRAWALS_HASH_ROOT || hash.startsWith(`${WITHDRAWALS_HASH_ROOT}/`);
}

// `#withdrawals/<requestId>` opens that request's page; the bare root is the list.
export function parseWithdrawalsHash(hash: string): string | null {
    if (!isWithdrawalsHash(hash)) return null;
    const rest = hash.slice(WITHDRAWALS_HASH_ROOT.length + 1);
    if (!rest) return null;
    try {
        return decodeURIComponent(rest);
    } catch {
        return null;
    }
}

export function formatWithdrawalsHash(requestId: string | null): string {
    return requestId ? `${WITHDRAWALS_HASH_ROOT}/${encodeURIComponent(requestId)}` : WITHDRAWALS_HASH_ROOT;
}
