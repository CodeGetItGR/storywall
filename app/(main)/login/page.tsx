'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginEmailForm } from '@/components/auth/LoginEmailForm';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { OAuthSignupAcceptanceModal } from '@/components/auth/OAuthSignupAcceptanceModal';
import { InviteEventCard } from '@/components/invite/InviteEventCard';
import { AuthLoadingState } from '@/components/layout/AuthLoadingState';
import { AppLink } from '@/components/ui/AppLink';
import { useAuthPageRedirect } from '@/hooks/useAuthPageRedirect';
import { useAuthReturnPath } from '@/hooks/useAuthReturnPath';
import { useLoginForm } from '@/hooks/useLoginForm';
import { useNavigateAfterSignIn } from '@/hooks/useNavigateAfterSignIn';
import type { AuthSessionDto } from '@/lib/api/types';
import { getPostAuthRedirectPath } from '@/lib/auth/returnPath';
import { routes } from '@/lib/routes';

export default function LoginPage() {
    const t = useTranslations('LoginPage');
    const navigateAfterSignIn = useNavigateAfterSignIn();
    const searchParams = useSearchParams();
    const inviteToken = searchParams.get('invite');
    const passwordChanged = searchParams.get('passwordChanged') === '1';
    const accountDeleted = searchParams.get('accountDeleted') === '1';
    const returnPath = useAuthReturnPath();

    const { shouldRenderAuthPage } = useAuthPageRedirect(returnPath);

    const handleSignedIn = useCallback(
        (session: AuthSessionDto) => {
            navigateAfterSignIn(getPostAuthRedirectPath(session.role, returnPath));
        },
        [navigateAfterSignIn, returnPath],
    );

    const form = useLoginForm({ inviteToken, initialEmail: searchParams.get('email') ?? '', onSignedIn: handleSignedIn });

    if (!shouldRenderAuthPage) {
        return <AuthLoadingState className="min-h-screen" />;
    }

    return (
        <AuthLayout showLanguageSwitcher>
            <InviteEventCard inviteToken={inviteToken} />

            {/* Email form */}
            <LoginEmailForm
                form={form}
                status={
                    <>
                        {passwordChanged && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{t('passwordChanged')}</p>}
                        {accountDeleted && <p className="rounded-2xl bg-surface-muted px-4 py-3 text-sm text-ink">{t('accountDeleted')}</p>}
                    </>
                }
            />

            {/* OAuth */}
            <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
                <span className="h-px flex-1 bg-surface-muted" />
                {t('orContinueWith')}
                <span className="h-px flex-1 bg-surface-muted" />
            </div>
            <OAuthButtons onSignIn={form.handleOAuthSignIn} onError={form.handleOAuthError} />
            {form.oauthSignIn.pendingSignup && (
                <OAuthSignupAcceptanceModal
                    versions={form.oauthSignIn.pendingSignup.versions}
                    onConfirmAction={form.oauthSignIn.handleSignupConfirm}
                    onErrorAction={form.oauthSignIn.handleSignupError}
                    onCloseAction={form.oauthSignIn.handleSignupCancel}
                />
            )}

            {/* Footer */}
            <p className="mt-6 text-center text-xs text-ink-muted">
                {t('noAccount')}{' '}
                <AppLink href={routes.auth.register({ invite: inviteToken, next: returnPath })} className="font-semibold text-ink hover:underline">
                    {t('createAccountLink')}
                </AppLink>
            </p>
        </AuthLayout>
    );
}
