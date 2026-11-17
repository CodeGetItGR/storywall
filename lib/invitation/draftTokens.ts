// A visitor's drafts (started signed out) open with the token the backend gave at start. It stays in
// this browser until the draft is claimed by an account or expires.

// guestwall-be InvitationDraftController.TOKEN_HEADER.
export const DRAFT_TOKEN_HEADER = 'X-Invitation-Draft-Token';

const STORAGE_KEY = 'storywall:invitationDraftTokens:v1';

type StoredToken = { token: string; expiresAt: string | null };
type StoredTokens = Record<string, StoredToken>;

function isStoredToken(value: unknown): value is StoredToken {
    if (!value || typeof value !== 'object') return false;
    const { token, expiresAt } = value as Record<string, unknown>;
    return typeof token === 'string' && token.length > 0 && (expiresAt === null || typeof expiresAt === 'string');
}

function isExpired({ expiresAt }: StoredToken, now: number): boolean {
    return expiresAt !== null && Date.parse(expiresAt) <= now;
}

// Storage can be missing or refuse (private windows, blocked site data): no token is then kept.
function readAll(): StoredTokens {
    try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
        if (!parsed || typeof parsed !== 'object') return {};
        return Object.fromEntries(Object.entries(parsed).filter(([, value]) => isStoredToken(value))) as StoredTokens;
    } catch {
        return {};
    }
}

function writeAll(tokens: StoredTokens): void {
    try {
        if (Object.keys(tokens).length === 0) window.localStorage.removeItem(STORAGE_KEY);
        else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } catch {
        // Best effort: the draft then only opens in this tab's session.
    }
}

// Keeps a new draft's token; expired ones are dropped on the way.
export function saveDraftToken(draftId: string, token: string, expiresAt: string | null, now: number = Date.now()): void {
    const live = Object.fromEntries(Object.entries(readAll()).filter(([, stored]) => !isExpired(stored, now)));
    writeAll({ ...live, [draftId]: { token, expiresAt } });
}

export function readDraftToken(draftId: string, now: number = Date.now()): string | null {
    const stored = readAll()[draftId];
    return stored && !isExpired(stored, now) ? stored.token : null;
}

export function forgetDraftToken(draftId: string): void {
    const tokens = readAll();
    if (!(draftId in tokens)) return;
    delete tokens[draftId];
    writeAll(tokens);
}

// The header a draft call sends when this browser holds the draft's token.
export function draftTokenHeaders(draftId: string): Record<string, string> {
    const token = readDraftToken(draftId);
    return token ? { [DRAFT_TOKEN_HEADER]: token } : {};
}
