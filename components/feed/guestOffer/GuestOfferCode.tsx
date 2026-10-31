'use client';

import { Check, Copy } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { formatDate } from '@/lib/datetime';

interface GuestOfferCodeProps {
    code: string;
    endsAt: string | null;
    isCopied: boolean;
    onCopy: () => void;
}

// The claimed code with a copy button and its last day.
export function GuestOfferCode({ code, endsAt, isCopied, onCopy }: GuestOfferCodeProps) {
    const t = useTranslations('GuestOffer');
    const locale = useLocale();

    return (
        <div className="w-full">
            {/* Code */}
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 py-3 pr-3 pl-4">
                <div className="min-w-0">
                    <p className="text-xs text-ink-muted">{t('codeLabel')}</p>
                    <code className="mt-0.5 block font-mono text-lg font-medium tracking-wider text-ink">{code}</code>
                </div>
                <button
                    type="button"
                    onClick={onCopy}
                    className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-[0.8125rem] font-semibold text-ink ring-1 ring-border"
                >
                    {isCopied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                    {isCopied ? t('copied') : t('copy')}
                </button>
            </div>

            {/* Expiry */}
            {endsAt && (
                <p className="mt-2.5 text-[0.8125rem] text-ink-muted">
                    {t('expires', { date: formatDate(locale, endsAt, { dateStyle: 'medium' }) })}
                </p>
            )}
        </div>
    );
}
