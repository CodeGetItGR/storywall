'use client';

import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { OAuthSignupAcceptanceModal } from '@/components/auth/OAuthSignupAcceptanceModal';
import { RegisterNewsletterCheckbox } from '@/components/auth/RegisterNewsletterCheckbox';
import { InviteEventCard } from '@/components/invite/InviteEventCard';
import { AuthLoadingState } from '@/components/layout/AuthLoadingState';
import { SignupAcceptanceCheckbox } from '@/components/legal/SignupAcceptanceCheckbox';
import { AppLink } from '@/components/ui/AppLink';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useAuthPageRedirect } from '@/hooks/useAuthPageRedirect';
import { useContentLimits } from '@/hooks/useContentLimits';
import { useRegisterForm } from '@/hooks/useRegisterForm';
import { AUTH_RETURN_PATH_PARAM, getSafeReturnPath } from '@/lib/auth/returnPath';
import { routes } from '@/lib/routes';

export default function RegisterPage() {
    const t = useTranslations('RegisterPage');
    const limits = useContentLimits();
    const searchParams = useSearchParams();
    const inviteToken = searchParams.get('invite');
    const returnPath = getSafeReturnPath(searchParams.get(AUTH_RETURN_PATH_PARAM));

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
            <form onSubmit={form.handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                    <FormFieldLabel label={t('fields.firstName')} required>
                        <div className="flex items-center gap-3 rounded-xl bg-surface-muted/70 px-4 py-3 transition focus-within:ring-2 focus-within:ring-primary/30">
                            <User className="h-4 w-4 shrink-0 text-ink-muted" />
                            <input
                                type="text"
                                name="firstName"
                                autoComplete="given-name"
                                placeholder={t('placeholders.firstName')}
                                required
                                maxLength={limits.personNameMaxLength}
                                value={form.fields.firstName}
                                onChange={form.handleFieldChange}
                                className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                            />
                        </div>
                    </FormFieldLabel>

                    <FormFieldLabel label={t('fields.lastName')} required>
                        <div className="flex items-center gap-3 rounded-xl bg-surface-muted/70 px-4 py-3 transition focus-within:ring-2 focus-within:ring-primary/30">
                            <input
                                type="text"
                                name="lastName"
                                autoComplete="family-name"
                                placeholder={t('placeholders.lastName')}
                                required
                                maxLength={limits.personNameMaxLength}
                                value={form.fields.lastName}
                                onChange={form.handleFieldChange}
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
                            name="email"
                            autoComplete="email"
                            placeholder={t('placeholders.email')}
                            required
                            maxLength={limits.emailMaxLength}
                            value={form.fields.email}
                            onChange={form.handleFieldChange}
                            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                        />
                    </div>
                </FormFieldLabel>

                <FormFieldLabel label={t('fields.password')} required>
                    <div className="flex items-center gap-3 rounded-xl bg-surface-muted/70 px-4 py-3 transition focus-within:ring-2 focus-within:ring-primary/30">
                        <Lock className="h-4 w-4 shrink-0 text-ink-muted" />
                        <input
                            type={form.showPassword ? 'text' : 'password'}
                            name="password"
                            autoComplete="new-password"
                            placeholder="••••••••"
                            required
                            minLength={limits.passwordMinLength}
                            maxLength={limits.passwordMaxLength}
                            value={form.fields.password}
                            onChange={form.handleFieldChange}
                            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                        />
                        <button
                            type="button"
                            onClick={form.handleTogglePassword}
                            aria-label={form.showPassword ? t('hidePassword') : t('showPassword')}
                            className="text-ink-faint transition-colors hover:text-ink-muted"
                        >
                            {form.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </FormFieldLabel>

                {/* Newsletter */}
                {form.newsletterConfig && (
                    <RegisterNewsletterCheckbox
                        checked={form.subscribeToNewsletter}
                        discountPercent={form.newsletterConfig.discountPercent}
                        onChangeAction={form.handleNewsletterChange}
                    />
                )}

                {/* Terms, Community Guidelines, 18+ */}
                <SignupAcceptanceCheckbox checked={form.accepted} onChangeAction={form.handleAcceptedChange} />

                {form.error && (
                    <p role="alert" className="-mt-1 text-center text-xs text-red-500">
                        {form.error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={form.isSubmitting}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {form.isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            {t('submit')}
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </button>
            </form>

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
