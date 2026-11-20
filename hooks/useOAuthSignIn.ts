'use client';

import { useCallback, useState } from 'react';

import type { SignupAcceptance } from '@/components/auth/OAuthSignupAcceptanceModal';
import { useAuth } from '@/hooks/useAuth';
import { getSignupAcceptanceRequiredDetails, isSignupAcceptanceRequiredError } from '@/lib/api/errors';
import type { AuthSessionDto, OAuthProviderName, SignupAcceptanceRequiredDetails } from '@/lib/api/types';
import { type AuthEntry, flowErrorCode, oauthMethod, trackFlow } from '@/lib/flowTracking';

// A Google/Apple sign-in that would create an account, held while the user accepts.
export type PendingOAuthSignup = { provider: OAuthProviderName; idToken: string; versions: SignupAcceptanceRequiredDetails | null };

// Google/Apple for the login and register pages. An existing account signs straight in;
// a new one comes back 3044 with nothing created, so the token is held until
// OAuthSignupAcceptanceModal confirms, then resent with the acceptance.
export function useOAuthSignIn({
    inviteToken,
    entry,
    onSignedInAction,
    onErrorAction,
}: {
    inviteToken: string | null;
    entry: AuthEntry;
    onSignedInAction: (session: AuthSessionDto) => void;
    // A failed resend other than a changed version: the pending token is not worth retrying.
    onErrorAction: (error: unknown) => void;
}) {
    const { oauth } = useAuth();
    const [pendingSignup, setPendingSignup] = useState<PendingOAuthSignup | null>(null);

    // Throws any failure other than a 3044, for the buttons to report.
    const handleSignIn = useCallback(
        async (provider: OAuthProviderName, idToken: string) => {
            const method = oauthMethod(provider);
            try {
                const session = await oauth(provider, { idToken, inviteToken: inviteToken ?? undefined });
                trackFlow({ name: 'Sign In', method, from: entry });
                onSignedInAction(session);
            } catch (err) {
                if (!isSignupAcceptanceRequiredError(err)) {
                    trackFlow({ name: 'Sign In Error', method, code: flowErrorCode(err) });
                    throw err;
                }
                setPendingSignup({ provider, idToken, versions: getSignupAcceptanceRequiredDetails(err) });
            }
        },
        [entry, inviteToken, oauth, onSignedInAction],
    );

    const handleSignupConfirm = useCallback(
        async (acceptance: SignupAcceptance) => {
            if (!pendingSignup) return;
            const method = oauthMethod(pendingSignup.provider);
            try {
                const session = await oauth(pendingSignup.provider, {
                    idToken: pendingSignup.idToken,
                    inviteToken: inviteToken ?? undefined,
                    ...acceptance,
                    adultConfirmed: true,
                });
                trackFlow({ name: 'Sign Up', method, from: entry });
                onSignedInAction(session);
            } catch (err) {
                trackFlow({ name: 'Sign Up Error', method, code: flowErrorCode(err) });
                throw err;
            }
        },
        [entry, inviteToken, oauth, onSignedInAction, pendingSignup],
    );

    // An expired Apple token lands here too: signing in again fetches a fresh one.
    const handleSignupError = useCallback(
        (err: unknown) => {
            setPendingSignup(null);
            onErrorAction(err);
        },
        [onErrorAction],
    );

    const handleSignupCancel = useCallback(() => {
        if (pendingSignup) trackFlow({ name: 'Sign Up Error', method: oauthMethod(pendingSignup.provider), code: 'cancelled' });
        setPendingSignup(null);
    }, [pendingSignup]);

    return { pendingSignup, handleSignIn, handleSignupConfirm, handleSignupError, handleSignupCancel };
}
