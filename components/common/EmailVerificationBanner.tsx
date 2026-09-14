'use client';

import { MailWarning } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

type ResendState = 'idle' | 'pending' | 'sent' | 'error';

export function EmailVerificationBanner() {
    const t = useTranslations('EmailVerificationBanner');
    const { user } = useAuth();
    const [resendState, setResendState] = useState<ResendState>('idle');

    const onResend = useCallback(async () => {
        if (!user?.email) return;
        setResendState('pending');
        try {
            await api.post(endpoints.auth.resendVerification, { email: user.email });
            setResendState('sent');
        } catch {
            setResendState('error');
        }
    }, [user]);

    return (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-2">
                <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="min-w-0">{t('message')}</p>
            </div>
            <button
                type="button"
                onClick={onResend}
                disabled={resendState === 'pending' || resendState === 'sent'}
                className="shrink-0 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-300 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {resendState === 'pending' ? t('resendPending') : resendState === 'sent' ? t('resendSent') : t('resend')}
            </button>
            {resendState === 'error' && <p className="text-xs text-amber-900 sm:basis-full">{t('resendError')}</p>}
        </div>
    );
}
