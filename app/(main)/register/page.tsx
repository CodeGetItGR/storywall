'use client';

import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { ChangeEvent, useCallback, useState } from 'react';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { RegisterNewsletterCheckbox } from '@/components/auth/RegisterNewsletterCheckbox';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppNewsletterConfig } from '@/hooks/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { useAuthPageRedirect } from '@/hooks/useAuthPageRedirect';
import { useNavigateAfterSignIn } from '@/hooks/useNavigateAfterSignIn';
import { AUTH_RETURN_PATH_PARAM, getPostRegisterRedirectPath, getSafeReturnPath } from '@/lib/auth/returnPath';
import { routes } from '@/lib/routes';

export default function RegisterPage() {
    const t = useTranslations('RegisterPage');
    const navigateAfterSignIn = useNavigateAfterSignIn();
    const searchParams = useSearchParams();
    const inviteToken = searchParams.get('invite');
    const returnPath = getSafeReturnPath(searchParams.get(AUTH_RETURN_PATH_PARAM));

    const { register, oauth } = useAuth();
    const { shouldRenderAuthPage } = useAuthPageRedirect(returnPath);
    const toErrorMessage = useApiErrorMessage();
    const newsletterConfig = useAppNewsletterConfig();

    const [showPw, setShowPw] = useState(false);
    const [email, setEmail] = useState(searchParams.get('email') ?? '');
    const [firstName, setFirstName] = useState(searchParams.get('firstName') ?? '');
    const [lastName, setLastName] = useState(searchParams.get('lastName') ?? '');
    const [password, setPassword] = useState('');
    const [subscribeToNewsletter, setSubscribeToNewsletter] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const auth = await register({
                email,
                password,
                firstName,
                lastName,
                inviteToken: inviteToken ?? undefined,
                subscribeToNewsletter: newsletterConfig ? subscribeToNewsletter : undefined,
            });
            navigateAfterSignIn(getPostRegisterRedirectPath(auth.role, Boolean(inviteToken)));
        } catch (err) {
            setError(toErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleOAuthSignIn = useCallback(
        async (provider: 'GOOGLE' | 'APPLE', idToken: string) => {
            setError(null);
            const auth = await oauth(provider, { idToken, inviteToken: inviteToken ?? undefined });
            navigateAfterSignIn(getPostRegisterRedirectPath(auth.role, Boolean(inviteToken)));
        },
        [inviteToken, oauth, navigateAfterSignIn],
    );

    const handleOAuthError = useCallback(
        (err: unknown) => {
            setError(toErrorMessage(err));
        },
        [toErrorMessage],
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

    const onTogglePasswordVisibility = useCallback(() => {
        setShowPw((p) => !p);
    }, []);

    if (!shouldRenderAuthPage) {
        return <div className="min-h-screen bg-background" />;
    }

    return (
        <AuthLayout showLanguageSwitcher>
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
                            minLength={8}
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
            <OAuthButtons onSignIn={handleOAuthSignIn} onError={handleOAuthError} />

            <p className="mt-6 text-center text-xs text-ink-muted">
                {t('haveAccount')}{' '}
                <Link href={routes.auth.login({ invite: inviteToken, next: returnPath })} className="font-semibold text-ink hover:underline">
                    {t('signInLink')}
                </Link>
            </p>
        </AuthLayout>
    );
}
