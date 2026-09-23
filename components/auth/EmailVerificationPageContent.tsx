'use client';

import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { useVerifyEmail } from '@/hooks/useVerifyEmail';
import { routes } from '@/lib/routes';

export function EmailVerificationPageContent() {
    const t = useTranslations('VerifyEmailPage');
    const { errorMessage, state } = useVerifyEmail();
    const isPending = state === 'pending';
    const isVerified = state === 'verified';

    return (
        <AuthLayout>
            {/* Verification status */}
            <div className="flex flex-col items-center text-center">
                {isPending ? (
                    <Loader2 aria-hidden="true" className="mb-5 size-10 animate-spin text-primary" />
                ) : isVerified ? (
                    <CheckCircle2 aria-hidden="true" className="mb-5 size-10 text-emerald-600" />
                ) : (
                    <XCircle aria-hidden="true" className="mb-5 size-10 text-red-500" />
                )}
                <h1 className="text-2xl font-bold text-ink">{isPending ? t('pendingTitle') : isVerified ? t('verifiedTitle') : t('invalidTitle')}</h1>
                <p className="mt-2 text-sm text-ink-muted">
                    {isPending ? t('pendingDescription') : isVerified ? t('verifiedDescription') : (errorMessage ?? t('invalidDescription'))}
                </p>
            </div>

            {/* Next action */}
            {!isPending && (
                <Link
                    href={routes.login}
                    className="mt-7 flex w-full items-center justify-center rounded-full py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90"
                >
                    {t('signIn')}
                </Link>
            )}
        </AuthLayout>
    );
}
