import type { PlatformRole } from '@/lib/api/types';

// The account step's screens, as the `account` search param. None in the URL is the choose screen.
export const ACCOUNT_VIEWS = ['choose', 'signup', 'signin', 'code', 'email'] as const;
export type AccountView = (typeof ACCOUNT_VIEWS)[number];

export function parseAccountView(value: string | null): AccountView {
    return ACCOUNT_VIEWS.find((view) => view === value) ?? 'choose';
}

type AccountState = { emailVerified: boolean | null; role: PlatformRole } | null;

// Signed out, or an email we know isn't verified. Still loading (null) is not "unverified".
export function needsAccountStep(user: AccountState): boolean {
    return user === null || user.emailVerified === false;
}

// Where the account step goes once someone is signed in; null while the email state loads.
export function accountDestination(user: AccountState): 'admin' | 'review' | 'code' | null {
    if (!user) return null;
    if (user.role === 'ADMIN') return 'admin';
    if (user.emailVerified === true) return 'review';
    if (user.emailVerified === false) return 'code';
    return null;
}
