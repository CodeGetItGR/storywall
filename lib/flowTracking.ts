import { track } from '@vercel/analytics';

import { getErrorCode } from '@/lib/api/errors';
import type { OAuthProviderName } from '@/lib/api/types';
import { getSafeReturnPath, isCreateEventPath } from '@/lib/auth/returnPath';

// Where people get through or stop in sign-up, event creation, checkout and invites, sent as Vercel
// Web Analytics custom events (no cookie, no identifier). Every value is a fixed label, a plan code or
// an API error code: never a name, an address, an id, a token or anything typed. Vercel's Pro plan
// keeps at most two properties per event, so no event here carries more.

// What brought someone to the login or register page.
export type AuthEntry = 'create' | 'invite' | 'other';
export type AuthMethod = 'email' | 'google' | 'apple';
export type CheckoutSource = 'wizard' | 'draft';
export type InviteState = 'open' | 'invalid' | 'expired' | 'used';

export type FlowEvent =
    | { name: 'Auth Page'; page: 'login' | 'register'; from: AuthEntry }
    | { name: 'Sign In'; method: AuthMethod; from: AuthEntry }
    | { name: 'Sign In Error'; method: AuthMethod; code: string }
    | { name: 'Sign Up'; method: AuthMethod; from: AuthEntry }
    | { name: 'Sign Up Error'; method: AuthMethod; code: string }
    | { name: 'Verify Wall' }
    | { name: 'Verify Resend' }
    | { name: 'Email Confirmed'; result: 'verified' | 'error'; plan: 'kept' | 'none' }
    | { name: 'Create Step'; step: string; type: string }
    | { name: 'Create Blocked'; reason: 'start_past' | 'start_too_far' }
    | { name: 'Consent Hint'; from: CheckoutSource }
    | { name: 'Checkout Open'; from: CheckoutSource; plan?: string }
    | { name: 'Checkout Error'; from: CheckoutSource; code: string }
    | { name: 'Checkout Result'; result: 'paid' | 'timed_out' | 'cancelled' }
    | { name: 'Invite Page'; state: InviteState; signedIn: boolean }
    | { name: 'Invite Choice'; choice: 'login' | 'register' }
    | { name: 'Invite Joined' };

const READY_RETRY_MS = 200;
const READY_RETRIES = 50;

export function trackFlow({ name, ...properties }: FlowEvent): void {
    track(name, properties);
}

// For an event sent as a page loads. An effect here runs before the one that sets up Vercel's script,
// and `track` drops anything sent before that. Sending from a timer also comes after this commit's
// beforeSend, so the event's page URL is redacted for the page it was sent from: a token never gets out.
// Outside production nothing sets the script up, and the event is dropped.
export function trackFlowWhenReady(event: FlowEvent, retriesLeft = READY_RETRIES): void {
    window.setTimeout(
        () => {
            if ('va' in window) trackFlow(event);
            else if (retriesLeft > 0) trackFlowWhenReady(event, retriesLeft - 1);
        },
        retriesLeft === READY_RETRIES ? 0 : READY_RETRY_MS,
    );
}

export function authEntry(inviteToken: string | null, returnPath: string | null): AuthEntry {
    if (inviteToken) return 'invite';
    const safePath = getSafeReturnPath(returnPath);
    return safePath && isCreateEventPath(safePath) ? 'create' : 'other';
}

export function oauthMethod(provider: OAuthProviderName): AuthMethod {
    return provider === 'GOOGLE' ? 'google' : 'apple';
}

// The API's error code, or 'unknown' for anything else (a network failure, a closed Google popup).
export function flowErrorCode(error: unknown): string {
    return String(getErrorCode(error) ?? 'unknown');
}

// Mirrors the terminal states of the invite page.
export function inviteState(
    preview: { expired: boolean; alreadyUsed: boolean; vendorType?: unknown } | null | undefined,
    isMissing: boolean,
): InviteState {
    if (isMissing || !preview) return 'invalid';
    if (preview.expired) return 'expired';
    if (preview.alreadyUsed && !preview.vendorType) return 'used';
    return 'open';
}
