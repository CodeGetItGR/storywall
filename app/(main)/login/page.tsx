'use client';

import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useState } from 'react';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { OAuthSignupAcceptanceModal, type SignupAcceptance } from '@/components/auth/OAuthSignupAcceptanceModal';
import { AuthLoadingState } from '@/components/layout/AuthLoadingState';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { useAuthPageRedirect } from '@/hooks/useAuthPageRedirect';
import { useContentLimits } from '@/hooks/useContentLimits';
import { useNavigateAfterSignIn } from '@/hooks/useNavigateAfterSignIn';
import { getSignupAcceptanceRequiredDetails, isSignupAcceptanceRequiredError } from '@/lib/api/errors';
import type { OAuthProviderName, SignupAcceptanceRequiredDetails } from '@/lib/api/types';
import { AUTH_RETURN_PATH_PARAM, getPostAuthRedirectPath, getSafeReturnPath } from '@/lib/auth/returnPath';
import { routes } from '@/lib/routes';

// A Google/Apple sign-in that would create an account, held while the user accepts.
type PendingOAuthSignup = { provider: OAuthProviderName; idToken: string; versions: SignupAcceptanceRequiredDetails | null };

export default function LoginPage() {
    const t = useTranslations('LoginPage');
    const limits = useContentLimits();
    const navigateAfterSignIn = useNavigateAfterSignIn();
    const searchParams = useSearchParams();
    const inviteToken = searchParams.get('invite');
    const passwordChanged = searchParams.get('passwordChanged') === '1';
    const returnPath = getSafeReturnPath(searchParams.get(AUTH_RETURN_PATH_PARAM));

    const { login, oauth } = useAuth();
    const { shouldRenderAuthPage } = useAuthPageRedirect(returnPath);
    const toErrorMessage = useApiErrorMessage();

    const [showPw, setShowPw] = useState(false);
    const [email, setEmail] = useState(searchParams.get('email') ?? '');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingSignup, setPendingSignup] = useState<PendingOAuthSignup | null>(null);

    const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    }, []);

    const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
    }, []);

    const handleTogglePasswordVisibility = useCallback(() => {
        setShowPw((p) => !p);
    }, []);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const auth = await login({ email, password, inviteToken: inviteToken ?? undefined });
            navigateAfterSignIn(getPostAuthRedirectPath(auth.role, returnPath));
        } catch (err) {
            setError(toErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleOAuthSignIn = useCallback(
        async (provider: 'GOOGLE' | 'APPLE', idToken: string) => {
            setError(null);
            try {
                const auth = await oauth(provider, { idToken, inviteToken: inviteToken ?? undefined });
                navigateAfterSignIn(getPostAuthRedirectPath(auth.role, returnPath));
            } catch (err) {
                // No account for this identity yet, and nothing was created: ask, then resend the same token.
                if (!isSignupAcceptanceRequiredError(err)) throw err;
                setPendingSignup({ provider, idToken, versions: getSignupAcceptanceRequiredDetails(err) });
            }
        },
        [inviteToken, oauth, returnPath, navigateAfterSignIn],
    );

    const handleSignupConfirm = useCallback(
        async (acceptance: SignupAcceptance) => {
            if (!pendingSignup) return;
            const auth = await oauth(pendingSignup.provider, {
                idToken: pendingSignup.idToken,
                inviteToken: inviteToken ?? undefined,
                ...acceptance,
                adultConfirmed: true,
            });
            navigateAfterSignIn(getPostAuthRedirectPath(auth.role, returnPath));
        },
        [inviteToken, oauth, pendingSignup, returnPath, navigateAfterSignIn],
    );

    // An expired Apple token lands here too: signing in again fetches a fresh one.
    const handleSignupError = useCallback(
        (err: unknown) => {
            setPendingSignup(null);
            setError(toErrorMessage(err));
        },
        [toErrorMessage],
    );

    const handleSignupCancel = useCallback(() => {
        setPendingSignup(null);
    }, []);

    const handleOAuthError = useCallback(
        (err: unknown) => {
            setError(toErrorMessage(err));
        },
        [toErrorMessage],
    );

    if (!shouldRenderAuthPage) {
        return <AuthLoadingState className="min-h-screen" />;
    }

    return (
        <AuthLayout showLanguageSwitcher>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Status */}
                {passwordChanged && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{t('passwordChanged')}</p>}

                {/* Email */}
                <FormFieldLabel label={t('fields.email')} required>
                    <div className="flex items-center gap-3 rounded-xl bg-surface-muted/70 px-4 py-3 transition focus-within:ring-2 focus-within:ring-primary/30">
                        <Mail className="h-4 w-4 shrink-0 text-ink-muted" />
                        <input
                            type="email"
                            placeholder={t('placeholders.email')}
                            required
                            maxLength={limits.emailMaxLength}
                            value={email}
                            onChange={handleEmailChange}
                            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                        />
                    </div>
                </FormFieldLabel>

                {/* Password */}
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
                            onChange={handlePasswordChange}
                            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                        />
                        <button
                            type="button"
                            onClick={handleTogglePasswordVisibility}
                            aria-label={showPw ? t('hidePassword') : t('showPassword')}
                            className="text-ink-faint transition-colors hover:text-ink-muted"
                        >
                            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </FormFieldLabel>

                {/* Password recovery */}
                <Link
                    href={routes.forgotPassword}
                    className="-mt-2 self-end text-xs font-semibold text-ink-muted transition-colors hover:text-ink hover:underline"
                >
                    {t('forgotPassword')}
                </Link>

                {/* Feedback */}
                {error && (
                    <p role="alert" className="-mt-1 text-center text-xs text-red-500">
                        {error}
                    </p>
                )}

                {/* Actions */}
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

            {/* OAuth */}
            <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
                <span className="h-px flex-1 bg-surface-muted" />
                {t('orContinueWith')}
                <span className="h-px flex-1 bg-surface-muted" />
            </div>
            <OAuthButtons onSignIn={handleOAuthSignIn} onError={handleOAuthError} />
            {pendingSignup && (
                <OAuthSignupAcceptanceModal
                    versions={pendingSignup.versions}
                    onConfirmAction={handleSignupConfirm}
                    onErrorAction={handleSignupError}
                    onCloseAction={handleSignupCancel}
                />
            )}

            <p className="mt-6 text-center text-xs text-ink-muted">
                {t('noAccount')}{' '}
                <Link href={routes.auth.register({ invite: inviteToken, next: returnPath })} className="font-semibold text-ink hover:underline">
                    {t('createAccountLink')}
                </Link>
            </p>
        </AuthLayout>
    );
}
