'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { ChangeEvent, SubmitEvent } from 'react';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppNewsletterConfig } from '@/hooks/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { communityGuidelinesQueryKey, useCommunityGuidelinesVersion } from '@/hooks/useCommunityGuidelinesVersion';
import { useNavigateAfterSignIn } from '@/hooks/useNavigateAfterSignIn';
import { useOAuthSignIn } from '@/hooks/useOAuthSignIn';
import { termsVersionQueryKey, useTermsVersion } from '@/hooks/useTermsVersion';
import { isGuidelinesVersionMismatchError, isTermsVersionMismatchError } from '@/lib/api/errors';
import type { AuthSessionDto, OAuthProviderName } from '@/lib/api/types';
import { getPostRegisterRedirectPath } from '@/lib/auth/returnPath';

export type RegisterFields = { firstName: string; lastName: string; email: string; password: string };

// The register page's email form and its Google/Apple sign-up. The inputs are named
// after RegisterFields, so one change handler serves them all.
export function useRegisterForm({
    inviteToken,
    returnPath,
    initialFields,
}: {
    inviteToken: string | null;
    returnPath: string | null;
    initialFields: Omit<RegisterFields, 'password'>;
}) {
    const t = useTranslations('RegisterPage');
    const { register } = useAuth();
    const navigateAfterSignIn = useNavigateAfterSignIn();
    const toErrorMessage = useApiErrorMessage();
    const newsletterConfig = useAppNewsletterConfig();
    const guidelinesVersion = useCommunityGuidelinesVersion();
    const termsVersion = useTermsVersion();
    const queryClient = useQueryClient();

    const [fields, setFields] = useState<RegisterFields>({ ...initialFields, password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [subscribeToNewsletter, setSubscribeToNewsletter] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFieldChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFields((current) => ({ ...current, [name]: value }));
    }, []);

    const handleTogglePassword = useCallback(() => {
        setShowPassword((p) => !p);
    }, []);

    const handleNewsletterChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setSubscribeToNewsletter(e.target.checked);
    }, []);

    const handleAcceptedChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setAccepted(e.target.checked);
    }, []);

    const handleSignedIn = useCallback(
        (session: AuthSessionDto) => {
            navigateAfterSignIn(getPostRegisterRedirectPath(session.role, Boolean(inviteToken), returnPath));
        },
        [inviteToken, navigateAfterSignIn, returnPath],
    );

    // A newer version went live while the page was open: fetch both and make the box tick again.
    const resetAfterVersionChange = useCallback(async () => {
        setAccepted(false);
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: communityGuidelinesQueryKey }),
            queryClient.invalidateQueries({ queryKey: termsVersionQueryKey }),
        ]);
        setError(t('acceptance.changed'));
    }, [queryClient, t]);

    const handleSubmit = useCallback(
        async (e: SubmitEvent<HTMLFormElement>) => {
            e.preventDefault();
            setError(null);
            if (!accepted) {
                setError(t('acceptance.required'));
                return;
            }
            if (!guidelinesVersion.data || !termsVersion.data) {
                // Still loading (or retrying) is not the same as failed: only a settled error asks for a refresh.
                setError(guidelinesVersion.isError || termsVersion.isError ? t('acceptance.unavailable') : t('acceptance.loading'));
                return;
            }
            setIsSubmitting(true);
            try {
                const session = await register({
                    ...fields,
                    inviteToken: inviteToken ?? undefined,
                    subscribeToNewsletter: newsletterConfig ? subscribeToNewsletter : undefined,
                    acceptedGuidelinesVersion: guidelinesVersion.data,
                    acceptedTermsVersion: termsVersion.data,
                    adultConfirmed: true,
                });
                handleSignedIn(session);
            } catch (err) {
                if (isGuidelinesVersionMismatchError(err) || isTermsVersionMismatchError(err)) await resetAfterVersionChange();
                else setError(toErrorMessage(err));
            } finally {
                setIsSubmitting(false);
            }
        },
        [
            accepted,
            fields,
            guidelinesVersion.data,
            guidelinesVersion.isError,
            handleSignedIn,
            inviteToken,
            newsletterConfig,
            register,
            resetAfterVersionChange,
            subscribeToNewsletter,
            t,
            termsVersion.data,
            termsVersion.isError,
            toErrorMessage,
        ],
    );

    const handleOAuthError = useCallback(
        (err: unknown) => {
            setError(toErrorMessage(err));
        },
        [toErrorMessage],
    );

    const oauthSignIn = useOAuthSignIn({ inviteToken, onSignedInAction: handleSignedIn, onErrorAction: handleOAuthError });
    const { handleSignIn } = oauthSignIn;

    const handleOAuthSignIn = useCallback(
        async (provider: OAuthProviderName, idToken: string) => {
            setError(null);
            await handleSignIn(provider, idToken);
        },
        [handleSignIn],
    );

    return {
        fields,
        showPassword,
        subscribeToNewsletter,
        accepted,
        isSubmitting,
        error,
        newsletterConfig,
        oauthSignIn,
        handleFieldChange,
        handleTogglePassword,
        handleNewsletterChange,
        handleAcceptedChange,
        handleSubmit,
        handleOAuthSignIn,
        handleOAuthError,
    };
}
