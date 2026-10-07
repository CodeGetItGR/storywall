'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { ChangeEvent, useCallback, useState } from 'react';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { RegisterBusinessSection } from '@/components/auth/RegisterBusinessSection';
import { RegisterNewsletterCheckbox } from '@/components/auth/RegisterNewsletterCheckbox';
import { InviteEventCard } from '@/components/invite/InviteEventCard';
import { AuthLoadingState } from '@/components/layout/AuthLoadingState';
import { AcceptanceCheckboxes } from '@/components/legal/AcceptanceCheckboxes';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppNewsletterConfig } from '@/hooks/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { useAuthPageRedirect } from '@/hooks/useAuthPageRedirect';
import { communityGuidelinesQueryKey, useCommunityGuidelinesVersion } from '@/hooks/useCommunityGuidelinesVersion';
import { useContentLimits } from '@/hooks/useContentLimits';
import { useNavigateAfterSignIn } from '@/hooks/useNavigateAfterSignIn';
import { useRegisterBusinessProfile } from '@/hooks/useRegisterBusinessProfile';
import { termsVersionQueryKey, useTermsVersion } from '@/hooks/useTermsVersion';
import { isGuidelinesVersionMismatchError, isTermsVersionMismatchError } from '@/lib/api/errors';
import { AUTH_RETURN_PATH_PARAM, getPostRegisterRedirectPath, getSafeReturnPath } from '@/lib/auth/returnPath';
import { routes } from '@/lib/routes';

function isVersionMismatchError(err: unknown): boolean {
    return isGuidelinesVersionMismatchError(err) || isTermsVersionMismatchError(err);
}

export default function RegisterPage() {
    const t = useTranslations('RegisterPage');
    const limits = useContentLimits();
    const navigateAfterSignIn = useNavigateAfterSignIn();
    const searchParams = useSearchParams();
    const inviteToken = searchParams.get('invite');
    const returnPath = getSafeReturnPath(searchParams.get(AUTH_RETURN_PATH_PARAM));

    const { register, oauth } = useAuth();
    const { shouldRenderAuthPage } = useAuthPageRedirect(returnPath);
    const toErrorMessage = useApiErrorMessage();
    const newsletterConfig = useAppNewsletterConfig();
    const business = useRegisterBusinessProfile();
    const guidelinesVersion = useCommunityGuidelinesVersion();
    const termsVersion = useTermsVersion();
    const queryClient = useQueryClient();

    const [showPw, setShowPw] = useState(false);
    const [email, setEmail] = useState(searchParams.get('email') ?? '');
    const [firstName, setFirstName] = useState(searchParams.get('firstName') ?? '');
    const [lastName, setLastName] = useState(searchParams.get('lastName') ?? '');
    const [password, setPassword] = useState('');
    const [subscribeToNewsletter, setSubscribeToNewsletter] = useState(false);
    const [acceptedDocuments, setAcceptedDocuments] = useState(false);
    const [adultConfirmed, setAdultConfirmed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Still loading (or retrying) is not the same as failed: only a settled error asks for a refresh.
    const versionsMissingMessage = guidelinesVersion.isError || termsVersion.isError ? t('acceptance.unavailable') : t('acceptance.loading');
    // Google's button can't be disabled, so the OAuth buttons only appear once a sign-up through them
    // would carry everything the backend needs to create the account.
    const canUseOAuth = acceptedDocuments && adultConfirmed && Boolean(guidelinesVersion.data && termsVersion.data);

    // A newer version went live while the page was open: fetch both and make them tick again.
    const resetAfterVersionChange = useCallback(async () => {
        setAcceptedDocuments(false);
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: communityGuidelinesQueryKey }),
            queryClient.invalidateQueries({ queryKey: termsVersionQueryKey }),
        ]);
        setError(t('acceptance.changed'));
    }, [queryClient, t]);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        if (!acceptedDocuments || !adultConfirmed) {
            setError(t('acceptance.required'));
            return;
        }
        if (!guidelinesVersion.data || !termsVersion.data) {
            setError(versionsMissingMessage);
            return;
        }
        const businessProfile = business.prepareRequest();
        if (businessProfile === false) return;
        setIsSubmitting(true);

        try {
            const auth = await register({
                email,
                password,
                firstName,
                lastName,
                inviteToken: inviteToken ?? undefined,
                subscribeToNewsletter: newsletterConfig ? subscribeToNewsletter : undefined,
                businessProfile: businessProfile ?? undefined,
                acceptedGuidelinesVersion: guidelinesVersion.data,
                acceptedTermsVersion: termsVersion.data,
                adultConfirmed: true,
            });
            navigateAfterSignIn(getPostRegisterRedirectPath(auth.role, Boolean(inviteToken)));
        } catch (err) {
            if (isVersionMismatchError(err)) {
                await resetAfterVersionChange();
            } else if (!business.handleSignupError(err)) {
                setError(toErrorMessage(err));
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleOAuthSignIn = useCallback(
        async (provider: 'GOOGLE' | 'APPLE', idToken: string) => {
            setError(null);
            const auth = await oauth(provider, {
                idToken,
                inviteToken: inviteToken ?? undefined,
                acceptedGuidelinesVersion: guidelinesVersion.data,
                acceptedTermsVersion: termsVersion.data,
                adultConfirmed: true,
            });
            navigateAfterSignIn(getPostRegisterRedirectPath(auth.role, Boolean(inviteToken)));
        },
        [inviteToken, oauth, navigateAfterSignIn, guidelinesVersion.data, termsVersion.data],
    );

    const handleOAuthError = useCallback(
        (err: unknown) => {
            if (isVersionMismatchError(err)) void resetAfterVersionChange();
            else setError(toErrorMessage(err));
        },
        [resetAfterVersionChange, toErrorMessage],
    );

    const onEmailChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    }, []);

    const onPasswordChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
    }, []);

    const onFirstNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setFirstName(e.target.value);
    }, []);

    const onLastNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setLastName(e.target.value);
    }, []);

    const onSubscribeToNewsletterChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setSubscribeToNewsletter(e.target.checked);
    }, []);

    const onAcceptedDocumentsChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setAcceptedDocuments(e.target.checked);
    }, []);

    const onAdultConfirmedChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setAdultConfirmed(e.target.checked);
    }, []);

    const onTogglePasswordVisibility = useCallback(() => {
        setShowPw((p) => !p);
    }, []);

    if (!shouldRenderAuthPage) {
        return <AuthLoadingState className="min-h-screen" />;
    }

    return (
        <AuthLayout showLanguageSwitcher>
            <InviteEventCard inviteToken={inviteToken} />
            <h2 className="mb-1 text-2xl font-bold text-ink">{t('title')}</h2>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                    <FormFieldLabel label={t('fields.firstName')} required>
                        <div className="flex items-center gap-3 rounded-xl bg-surface-muted/70 px-4 py-3 transition focus-within:ring-2 focus-within:ring-primary/30">
                            <User className="h-4 w-4 shrink-0 text-ink-muted" />
                            <input
                                type="text"
                                placeholder={t('placeholders.firstName')}
                                required
                                maxLength={limits.personNameMaxLength}
                                value={firstName}
                                onChange={onFirstNameChange}
                                className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                            />
                        </div>
                    </FormFieldLabel>

                    <FormFieldLabel label={t('fields.lastName')} required>
                        <div className="flex items-center gap-3 rounded-xl bg-surface-muted/70 px-4 py-3 transition focus-within:ring-2 focus-within:ring-primary/30">
                            <input
                                type="text"
                                placeholder={t('placeholders.lastName')}
                                required
                                maxLength={limits.personNameMaxLength}
                                value={lastName}
                                onChange={onLastNameChange}
                                className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                            />
                        </div>
                    </FormFieldLabel>
                </div>

                <FormFieldLabel label={t('fields.email')} required>
                    <div className="flex items-center gap-3 rounded-xl bg-surface-muted/70 px-4 py-3 transition focus-within:ring-2 focus-within:ring-primary/30">
                        <Mail className="h-4 w-4 shrink-0 text-ink-muted" />
                        <input
                            type="email"
                            placeholder={t('placeholders.email')}
                            required
                            maxLength={limits.emailMaxLength}
                            value={email}
                            onChange={onEmailChange}
                            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                        />
                    </div>
                </FormFieldLabel>

                <FormFieldLabel label={t('fields.password')} required>
                    <div className="flex items-center gap-3 rounded-xl bg-surface-muted/70 px-4 py-3 transition focus-within:ring-2 focus-within:ring-primary/30">
                        <Lock className="h-4 w-4 shrink-0 text-ink-muted" />
                        <input
                            type={showPw ? 'text' : 'password'}
                            placeholder="••••••••"
                            required
                            minLength={limits.passwordMinLength}
                            maxLength={limits.passwordMaxLength}
                            value={password}
                            onChange={onPasswordChange}
                            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                        />
                        <button
                            type="button"
                            onClick={onTogglePasswordVisibility}
                            aria-label={showPw ? t('hidePassword') : t('showPassword')}
                            className="text-ink-faint transition-colors hover:text-ink-muted"
                        >
                            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </FormFieldLabel>

                {/* Newsletter */}
                {newsletterConfig && (
                    <RegisterNewsletterCheckbox
                        checked={subscribeToNewsletter}
                        discountPercent={newsletterConfig.discountPercent}
                        onChangeAction={onSubscribeToNewsletterChange}
                    />
                )}

                {/* Business */}
                <RegisterBusinessSection business={business} />

                {/* Terms, Community Guidelines, 18+ */}
                <AcceptanceCheckboxes
                    accepted={acceptedDocuments}
                    adultConfirmed={adultConfirmed}
                    onAcceptedChangeAction={onAcceptedDocumentsChange}
                    onAdultConfirmedChangeAction={onAdultConfirmedChange}
                />

                {error && (
                    <p role="alert" className="-mt-1 text-center text-xs text-red-500">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            {t('submit')}
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
                <span className="h-px flex-1 bg-surface-muted" />
                {t('orContinueWith')}
                <span className="h-px flex-1 bg-surface-muted" />
            </div>
            {canUseOAuth ? (
                <OAuthButtons onSignIn={handleOAuthSignIn} onError={handleOAuthError} />
            ) : (
                <p className="text-center text-xs text-ink-muted">
                    {acceptedDocuments && adultConfirmed ? versionsMissingMessage : t('acceptance.oauthHint')}
                </p>
            )}

            <p className="mt-6 text-center text-xs text-ink-muted">
                {t('haveAccount')}{' '}
                <Link href={routes.auth.login({ invite: inviteToken, next: returnPath })} className="font-semibold text-ink hover:underline">
                    {t('signInLink')}
                </Link>
            </p>
        </AuthLayout>
    );
}
