import type { PlatformRole } from '@/lib/api/types';

// Access token lives in memory only (never persisted) so it can't be read
// by a stored-XSS payload after the fact. The refresh token / inviteToken
// are the only things that survive a reload, in sessionStorage (cleared
// when the tab closes) rather than localStorage, per the integration
// guide's warning that this API never issues httpOnly cookies.
//
// Open question (flagged in the plan): sessionStorage still isn't XSS-proof.
// Revisit if the backend adds cookie-based refresh.

const REFRESH_TOKEN_KEY = 'storywall.refreshToken';
const INVITE_TOKEN_KEY = 'storywall.inviteToken';

interface AuthState {
    accessToken: string | null;
    userId: string | null;
    email: string | null;
    role: PlatformRole | null;
    displayName: string | null;
}

let state: AuthState = {
    accessToken: null,
    userId: null,
    email: null,
    role: null,
    displayName: null,
};

type Listener = (state: AuthState) => void;
const listeners = new Set<Listener>();

function emit() {
    for (const listener of listeners) listener(state);
}

export function subscribeAuthState(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getAuthState(): AuthState {
    return state;
}

export function setSession(input: { accessToken: string; userId: string; email: string | null; role: PlatformRole; displayName: string }) {
    state = {
        accessToken: input.accessToken,
        userId: input.userId,
        email: input.email,
        role: input.role,
        displayName: input.displayName,
    };
    emit();
}

export function setAccessToken(accessToken: string) {
    state = { ...state, accessToken };
    emit();
}

export function clearSession() {
    state = { accessToken: null, userId: null, email: null, role: null, displayName: null };
    if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        window.sessionStorage.removeItem(INVITE_TOKEN_KEY);
    }
    emit();
}

export function getAccessToken(): string | null {
    return state.accessToken;
}

export function getStoredRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(refreshToken: string | null) {
    if (typeof window === 'undefined') return;
    if (refreshToken) {
        window.sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
        window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
}

// Guests have no refresh token — re-POST the same inviteToken to
// /guest-login when the 24h access token expires.
export function getStoredInviteToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(INVITE_TOKEN_KEY);
}

export function setStoredInviteToken(inviteToken: string | null) {
    if (typeof window === 'undefined') return;
    if (inviteToken) {
        window.sessionStorage.setItem(INVITE_TOKEN_KEY, inviteToken);
    } else {
        window.sessionStorage.removeItem(INVITE_TOKEN_KEY);
    }
}
