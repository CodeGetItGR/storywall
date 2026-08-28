'use client';

import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useState } from 'react';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { useAuthPageRedirect } from '@/hooks/useAuthPageRedirect';
import { useAcceptEventInvitation } from '@/hooks/useEventInvitations';
import { joinEventAfterAuth } from '@/lib/invite/joinAfterAuth';
import { findNextPlan } from '@/lib/planTiers';
import { routes } from '@/lib/routes';

export default function LoginPage() {
    const t = useTranslations('LoginPage');
    const router = useRouter();
    const searchParams = useSearchParams();
    const inviteToken = searchParams.get('invite');
    const passwordChanged = searchParams.get('passwordChanged') === '1';

    const { login } = useAuth();
    const { shouldRenderAuthPage } = useAuthPageRedirect();
    const acceptInvitation = useAcceptEventInvitation();
    const { data: appConfig } = useAppConfig();
    const toErrorMessage = useApiErrorMessage();

    const [showPw, setShowPw] = useState(false);
    const [email, setEmail] = useState(searchParams.get('email') ?? '');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            const auth = await login({ email, password });

            if (inviteToken) {
                const result = await joinEventAfterAuth((token) => acceptInvitation.mutateAsync(token), inviteToken);
                if (result.status === 'expired') {
                    setError(t('expiredInvite'));
                    return;
                }
                if (result.status === 'memberLimitExceeded') {
                    const nextPlan = result.planCode ? findNextPlan(appConfig?.planTiers ?? [], 'EVENT', result.planCode) : undefined;
                    setError(nextPlan ? t('memberLimitExceededWithPlan', { plan: nextPlan.name }) : t('memberLimitExceeded'));
                    return;
                }
                if (result.status === 'invitationExhausted') {
                    setError(t('invitationExhausted'));
                    return;
                }
            }

            router.replace(auth.role === 'ADMIN' ? routes.admin : routes.feed);
        } catch (err) {
            setError(toErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    if (!shouldRenderAuthPage) {
        return <div className="min-h-screen bg-background" />;
    }

    return (
        <AuthLayout>
            {/*<h2 className="text-2xl font-bold text-ink mb-5 text-center">{t('title')}</h2>*/}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Status */}
                {passwordChanged && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{t('passwordChanged')}</p>}

                {/* Email */}
                <FormFieldLabel label={t('fields.email')} required>
                    <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                        <Mail className="w-4 h-4 text-ink-muted shrink-0" />
                        <input
                            type="email"
                            placeholder={t('placeholders.email')}
                            required
                            value={email}
                            onChange={handleEmailChange}
                            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                        />
                    </div>
                </FormFieldLabel>

                {/* Password */}
                <FormFieldLabel label={t('fields.password')} required>
                    <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                        <Lock className="w-4 h-4 text-ink-muted shrink-0" />
                        <input
                            type={showPw ? 'text' : 'password'}
                            placeholder="••••••••"
                            required
                            minLength={8}
                            value={password}
                            onChange={handlePasswordChange}
                            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                        />
                        <button
                            type="button"
                            onClick={handleTogglePasswordVisibility}
                            aria-label={showPw ? t('hidePassword') : t('showPassword')}
                            className="text-ink-faint hover:text-ink-muted transition-colors"
                        >
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </FormFieldLabel>

                {/* Feedback */}
                {error && (
                    <p role="alert" className="text-xs text-center text-red-500 -mt-1">
                        {error}
                    </p>
                )}

                {/* Actions */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            {t('submit')}
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>

            <p className="text-xs text-center text-ink-muted mt-6">
                {t('noAccount')}{' '}
                <Link
                    href={inviteToken ? routes.auth.register({ invite: inviteToken }) : routes.register}
                    className="font-semibold text-ink hover:underline"
                >
                    {t('createAccountLink')}
                </Link>
            </p>
        </AuthLayout>
    );
}
