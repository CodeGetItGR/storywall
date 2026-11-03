'use client';

import { useTranslations } from 'next-intl';

import { VerifyEmailArt } from '@/components/home/HomeEmptyArt';
import { useResendVerificationEmail } from '@/hooks/useResendVerificationEmail';

// Shown instead of the empty state while the account's email isn't confirmed yet.
export function HomeVerifyEmailState() {
    const t = useTranslations('EmailVerificationBanner');
    const { state: resendState, resend: onResend } = useResendVerificationEmail();

    return (
        <div className="flex min-h-[35vh] flex-col items-center justify-center gap-6 px-4 text-center">
            {/* Drawing */}
            <VerifyEmailArt />

            {/* Message */}
            <p className="max-w-xs text-base font-semibold text-ink">{t('message')}</p>

            {/* Resend */}
            <div className="flex flex-col items-center gap-2">
                <button
                    type="button"
                    onClick={onResend}
                    disabled={resendState === 'pending' || resendState === 'sent'}
                    className="rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(255,122,89,0.28)] transition-opacity bg-gradient-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {resendState === 'pending' ? t('resendPending') : resendState === 'sent' ? t('resendSent') : t('resend')}
                </button>
                {resendState === 'error' && <p className="text-xs text-status-danger">{t('resendError')}</p>}
            </div>
        </div>
    );
}
