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
    lastName: string | null;
    profilePictureUrl: string | null;
}

let state: AuthState = {
    accessToken: null,
    userId: null,
    email: null,
    role: null,
    displayName: null,
    lastName: null,
    profilePictureUrl: null,
};

type Listener = (state: AuthState) => void;
const listeners = new Set<Listener>();

// Bumped on every write. An async caller that decided what the session should
// be (the bootstrap probe, most of all) can snapshot this before it awaits and
// check it again after, so a slow in-flight probe can't overwrite a session
// that a login — or a logout — established while it was still running.
let generation = 0;

export function getSessionGeneration(): number {
    return generation;
}

function emit() {
    generation += 1;
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
    const isSameUser = state.userId === session.userId;
    state = {
        accessToken: session.accessToken,
        userId: session.userId,
        email: session.email,
        role: session.role,
        displayName: session.displayName,
        lastName: session.lastName ?? (isSameUser ? state.lastName : null),
        profilePictureUrl: session.profilePictureUrl ?? (isSameUser ? state.profilePictureUrl : null),
    };
    emit();
}

export function updateSessionProfile(profile: Pick<AuthSessionDto, 'displayName' | 'lastName' | 'profilePictureUrl'>) {
    state = {
        ...state,
        displayName: profile.displayName,
        lastName: profile.lastName ?? null,
        profilePictureUrl: profile.profilePictureUrl ?? null,
    };
    emit();
}

export function clearSession() {
    state = { accessToken: null, userId: null, email: null, role: null, displayName: null, lastName: null, profilePictureUrl: null };
    emit();
}

export function getAccessToken(): string | null {
    return state.accessToken;
}
