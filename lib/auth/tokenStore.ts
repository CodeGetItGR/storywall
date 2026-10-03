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
    firstName: string | null;
    lastName: string | null;
    profilePictureUrl: string | null;
    authProvider: AuthSessionDto['authProvider'] | null;
    isGuestAccount: boolean | null;
    status: AuthSessionDto['status'] | null;
    createdAt: string | null;
    // Not part of AuthSessionDto (login/register/session don't carry it yet) —
    // only ever set via updateSessionProfile once /api/me has been fetched.
    // null means "not fetched yet", not "unverified".
    emailVerified: boolean | null;
    // When the access token expires (ms, this device's clock). lib/api/client.ts
    // refreshes it a minute before.
    expiresAt: number | null;
}

// The access token lives 15 minutes (the integration guide; the API doesn't
// say). A token straight from sign-in or a refresh has all of it left.
export const ACCESS_TOKEN_LIFETIME_MS = 15 * 60 * 1000;

let state: AuthState = {
    accessToken: null,
    userId: null,
    email: null,
    role: null,
    firstName: null,
    lastName: null,
    profilePictureUrl: null,
    authProvider: null,
    isGuestAccount: null,
    status: null,
    createdAt: null,
    emailVerified: null,
    expiresAt: null,
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

// expiresInMs: what's left of the token's lifetime. Only a token the server
// handed over on page load (lib/auth/sessionHandoff.ts) can be part-way through it.
export function setSession(session: AuthSessionDto, expiresInMs = ACCESS_TOKEN_LIFETIME_MS) {
    state = {
        accessToken: session.accessToken,
        userId: session.userId,
        email: session.email,
        role: session.role,
        firstName: session.firstName,
        lastName: session.lastName,
        profilePictureUrl: session.profilePictureUrl,
        authProvider: session.authProvider,
        isGuestAccount: session.isGuestAccount,
        status: session.status,
        createdAt: session.createdAt,
        // Reset on every new session — the previous account's verification
        // state must never leak onto whoever this session now belongs to.
        // Re-populated once /api/me resolves for the new session.
        emailVerified: null,
        expiresAt: Date.now() + expiresInMs,
    };
    emit();
}

export function updateSessionProfile(profile: Pick<AuthSessionDto, 'firstName' | 'lastName' | 'profilePictureUrl'> & { emailVerified?: boolean }) {
    state = {
        ...state,
        firstName: profile.firstName,
        lastName: profile.lastName ?? null,
        profilePictureUrl: profile.profilePictureUrl ?? null,
        emailVerified: profile.emailVerified ?? state.emailVerified,
    };
    emit();
}

export function clearSession() {
    state = {
        accessToken: null,
        userId: null,
        email: null,
        role: null,
        firstName: null,
        lastName: null,
        profilePictureUrl: null,
        authProvider: null,
        isGuestAccount: null,
        status: null,
        createdAt: null,
        emailVerified: null,
        expiresAt: null,
    };
    emit();
}

export function getAccessToken(): string | null {
    return state.accessToken;
}
