'use client';

import type { ChangeEvent, SubmitEvent } from 'react';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { useOAuthSignIn } from '@/hooks/useOAuthSignIn';
import type { AuthSessionDto, OAuthProviderName } from '@/lib/api/types';
import { type AuthEntry, flowErrorCode, trackFlow } from '@/lib/flowTracking';

// The sign-in form (email and password, Google, Apple). The page navigates after sign-in; the
// create wizard stays put and moves to its next screen.
export function useLoginForm({
    inviteToken,
    entry,
    initialEmail,
    onSignedIn,
}: {
    inviteToken: string | null;
    // What brought them here, for the sign-in step count.
    entry: AuthEntry;
    initialEmail: string;
    onSignedIn: (session: AuthSessionDto) => void;
}) {
    const { login } = useAuth();
    const toErrorMessage = useApiErrorMessage();

    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEmailChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    }, []);

    const handlePasswordChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
    }, []);

    const handleTogglePassword = useCallback(() => {
        setShowPassword((p) => !p);
    }, []);

    const handleSubmit = useCallback(
        async (e: SubmitEvent<HTMLFormElement>) => {
            e.preventDefault();
            setError(null);
            setIsSubmitting(true);

            try {
                const session = await login({ email, password, inviteToken: inviteToken ?? undefined });
                trackFlow({ name: 'Sign In', method: 'email', from: entry });
                onSignedIn(session);
            } catch (err) {
                trackFlow({ name: 'Sign In Error', method: 'email', code: flowErrorCode(err) });
                setError(toErrorMessage(err));
            } finally {
                setIsSubmitting(false);
            }
        },
        [email, entry, inviteToken, login, onSignedIn, password, toErrorMessage],
    );

    const handleOAuthError = useCallback(
        (err: unknown) => {
            setError(toErrorMessage(err));
        },
        [toErrorMessage],
    );

    const oauthSignIn = useOAuthSignIn({ inviteToken, entry, onSignedInAction: onSignedIn, onErrorAction: handleOAuthError });
    const { handleSignIn } = oauthSignIn;

    const handleOAuthSignIn = useCallback(
        async (provider: OAuthProviderName, idToken: string) => {
            setError(null);
            await handleSignIn(provider, idToken);
        },
        [handleSignIn],
    );

    return {
        email,
        password,
        showPassword,
        isSubmitting,
        error,
        oauthSignIn,
        handleEmailChange,
        handlePasswordChange,
        handleTogglePassword,
        handleSubmit,
        handleOAuthSignIn,
        handleOAuthError,
    };
}
