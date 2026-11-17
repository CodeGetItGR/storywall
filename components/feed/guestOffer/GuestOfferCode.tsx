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

// The claimed code with its last day and a copy button.
export function GuestOfferCode({ code, endsAt, isCopied, onCopy }: GuestOfferCodeProps) {
    const t = useTranslations('GuestOffer');
    const locale = useLocale();

    return (
        // Code: kept on one line; Copy moves under it when the card is too narrow for both
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 py-2 pr-2 pl-3.5">
            <div className="min-w-0">
                <p className="text-xs text-ink-muted">
                    {endsAt ? t('validUntil', { date: formatDate(locale, endsAt, { dateStyle: 'medium' }) }) : t('codeLabel')}
                </p>
                <code className="block font-mono text-base font-medium tracking-wider whitespace-nowrap text-ink">{code}</code>
            </div>
            <button
                type="button"
                onClick={onCopy}
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-[0.8125rem] font-medium text-ink ring-1 ring-border"
            >
                {isCopied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                {isCopied ? t('copied') : t('copy')}
            </button>
        </div>
    );
}
