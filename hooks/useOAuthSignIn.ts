'use client';

import { useCallback, useState } from 'react';

import type { SignupAcceptance } from '@/components/auth/OAuthSignupAcceptanceModal';
import { useAuth } from '@/hooks/useAuth';
import { getSignupAcceptanceRequiredDetails, isSignupAcceptanceRequiredError } from '@/lib/api/errors';
import type { AuthSessionDto, OAuthProviderName, SignupAcceptanceRequiredDetails } from '@/lib/api/types';

// A Google/Apple sign-in that would create an account, held while the user accepts.
export type PendingOAuthSignup = { provider: OAuthProviderName; idToken: string; versions: SignupAcceptanceRequiredDetails | null };

// Google/Apple for the login and register pages. An existing account signs straight in;
// a new one comes back 3044 with nothing created, so the token is held until
// OAuthSignupAcceptanceModal confirms, then resent with the acceptance.
export function useOAuthSignIn({
    inviteToken,
    onSignedInAction,
    onErrorAction,
}: {
    inviteToken: string | null;
    onSignedInAction: (session: AuthSessionDto) => void;
    // A failed resend other than a changed version: the pending token is not worth retrying.
    onErrorAction: (error: unknown) => void;
}) {
    const { oauth } = useAuth();
    const [pendingSignup, setPendingSignup] = useState<PendingOAuthSignup | null>(null);

    // Throws any failure other than a 3044, for the buttons to report.
    const handleSignIn = useCallback(
        async (provider: OAuthProviderName, idToken: string) => {
            try {
                onSignedInAction(await oauth(provider, { idToken, inviteToken: inviteToken ?? undefined }));
            } catch (err) {
                if (!isSignupAcceptanceRequiredError(err)) throw err;
                setPendingSignup({ provider, idToken, versions: getSignupAcceptanceRequiredDetails(err) });
            }
        },
        [inviteToken, oauth, onSignedInAction],
    );

    const handleSignupConfirm = useCallback(
        async (acceptance: SignupAcceptance) => {
            if (!pendingSignup) return;
            const session = await oauth(pendingSignup.provider, {
                idToken: pendingSignup.idToken,
                inviteToken: inviteToken ?? undefined,
                ...acceptance,
                adultConfirmed: true,
            });
            onSignedInAction(session);
        },
        [inviteToken, oauth, onSignedInAction, pendingSignup],
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
        setPendingSignup(null);
    }, []);

    return { pendingSignup, handleSignIn, handleSignupConfirm, handleSignupError, handleSignupCancel };
}
