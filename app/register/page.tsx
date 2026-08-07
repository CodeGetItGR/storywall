'use client';

import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { ChangeEvent, useCallback, useState } from 'react';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { useAcceptEventInvitation } from '@/hooks/useEventInvitations';
import { getErrorMessage } from '@/lib/api/errors';
import { joinEventAfterAuth } from '@/lib/invite/joinAfterAuth';
import { findNextPlan } from '@/lib/planTiers';
import { routes } from '@/lib/routes';

export default function RegisterPage() {
    const t = useTranslations('RegisterPage');
    const router = useRouter();
    const searchParams = useSearchParams();
    const inviteToken = searchParams.get('invite');

    const { register } = useAuth();
    const acceptInvitation = useAcceptEventInvitation();
    const { data: appConfig } = useAppConfig();

    const [showPw, setShowPw] = useState(false);
    const [email, setEmail] = useState(searchParams.get('email') ?? '');
    const [displayName, setDisplayName] = useState(searchParams.get('displayName') ?? '');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const auth = await register({ email, password, displayName });

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
            }

            router.push(auth.role === 'ADMIN' ? routes.admin : routes.feed);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    const onEmailChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    }, []);

    const onPasswordChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
    }, []);

    const onDisplayNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setDisplayName(e.target.value);
    }, []);

    const onTogglePasswordVisibility = useCallback(() => {
        setShowPw((p) => !p);
    }, []);

    return (
        <AuthLayout>
            <h2 className="text-2xl font-bold text-ink mb-1">{t('title')}</h2>
            <p className="text-sm text-ink-muted mb-7">{t('subtitle')}</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('fields.fullName')}</span>
                    <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                        <User className="w-4 h-4 text-ink-muted shrink-0" />
                        <input
                            type="text"
                            placeholder={t('placeholders.fullName')}
                            required
                            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                            onChange={onDisplayNameChange}
                        />
                    </div>
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('fields.email')}</span>
                    <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                        <Mail className="w-4 h-4 text-ink-muted shrink-0" />
                        <input
                            type="email"
                            placeholder={t('placeholders.email')}
                            required
                            value={email}
                            onChange={onEmailChange}
                            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                        />
                    </div>
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('fields.password')}</span>
                    <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                        <Lock className="w-4 h-4 text-ink-muted shrink-0" />
                        <input
                            type={showPw ? 'text' : 'password'}
                            placeholder="••••••••"
                            required
                            minLength={8}
                            value={password}
                            onChange={onPasswordChange}
                            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                        />
                        <button
                            type="button"
                            onClick={onTogglePasswordVisibility}
                            aria-label={showPw ? t('hidePassword') : t('showPassword')}
                            className="text-ink-faint hover:text-ink-muted transition-colors"
                        >
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </label>

                {error && (
                    <p role="alert" className="text-xs text-center text-red-500 -mt-1">
                        {error}
                    </p>
                )}

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
                {t('haveAccount')}{' '}
                <Link
                    href={inviteToken ? routes.auth.login({ invite: inviteToken }) : routes.login}
                    className="font-semibold text-ink hover:underline"
                >
                    {t('signInLink')}
                </Link>
            </p>
        </AuthLayout>
    );
}
