'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { OAuthSignupAcceptanceModal } from '@/components/auth/OAuthSignupAcceptanceModal';
import { RegisterEmailForm } from '@/components/auth/RegisterEmailForm';
import { InviteEventCard } from '@/components/invite/InviteEventCard';
import { AuthLoadingState } from '@/components/layout/AuthLoadingState';
import { AppLink } from '@/components/ui/AppLink';
import { useAuthPageRedirect } from '@/hooks/useAuthPageRedirect';
import { useAuthReturnPath } from '@/hooks/useAuthReturnPath';
import { useRegisterForm } from '@/hooks/useRegisterForm';
import { routes } from '@/lib/routes';

export default function RegisterPage() {
    const t = useTranslations('RegisterPage');
    const searchParams = useSearchParams();
    const inviteToken = searchParams.get('invite');
    const returnPath = useAuthReturnPath();

    const { shouldRenderAuthPage } = useAuthPageRedirect(returnPath);
    const form = useRegisterForm({
        inviteToken,
        returnPath,
        initialFields: {
            email: searchParams.get('email') ?? '',
            firstName: searchParams.get('firstName') ?? '',
            lastName: searchParams.get('lastName') ?? '',
        },
    });

    if (!shouldRenderAuthPage) {
        return <AuthLoadingState className="min-h-screen" />;
    }

    return (
        <AuthLayout showLanguageSwitcher>
            <InviteEventCard inviteToken={inviteToken} />

            {/* Header */}
            <h2 className="mb-1 text-2xl font-bold text-ink">{t('title')}</h2>

            {/* OAuth */}
            <div className="mt-4">
                <OAuthButtons onSignIn={form.handleOAuthSignIn} onError={form.handleOAuthError} />
            </div>
            {form.oauthSignIn.pendingSignup && (
                <OAuthSignupAcceptanceModal
                    versions={form.oauthSignIn.pendingSignup.versions}
                    onConfirmAction={form.oauthSignIn.handleSignupConfirm}
                    onErrorAction={form.oauthSignIn.handleSignupError}
                    onCloseAction={form.oauthSignIn.handleSignupCancel}
                />
            )}

            <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
                <span className="h-px flex-1 bg-surface-muted" />
                {t('orWithEmail')}
                <span className="h-px flex-1 bg-surface-muted" />
            </div>

            {/* Email form */}
            <RegisterEmailForm form={form} />

            {/* Footer */}
            <p className="mt-6 text-center text-xs text-ink-muted">
                {t('haveAccount')}{' '}
                <AppLink href={routes.auth.login({ invite: inviteToken, next: returnPath })} className="font-semibold text-ink hover:underline">
                    {t('signInLink')}
                </AppLink>
            </p>
        </AuthLayout>
    );
}
