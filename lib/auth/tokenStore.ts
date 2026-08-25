import type { AuthSessionDto } from '@/lib/api/types';

// The access token is memory-only and never persisted — it doesn't survive a
// reload, which is intentional (nothing durable here is reachable by a
// stored-XSS payload). The refresh token / guest identity that used to live
// in sessionStorage/localStorage now live server-side only, in httpOnly
// cookies set by the /api/auth/* route handlers (see lib/auth/authCookies.ts)
// — this module has no knowledge of them at all.

interface AuthState {
    accessToken: string | null;
    userId: string | null;
    email: string | null;
    role: AuthSessionDto['role'] | null;
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

export function setSession(session: AuthSessionDto) {
    state = {
        accessToken: session.accessToken,
        userId: session.userId,
        email: session.email,
        role: session.role,
        displayName: session.displayName,
    };
    emit();
}

export function clearSession() {
    state = { accessToken: null, userId: null, email: null, role: null, displayName: null };
    emit();
}

export function getAccessToken(): string | null {
    return state.accessToken;
}
