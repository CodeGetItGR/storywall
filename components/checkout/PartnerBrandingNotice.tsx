'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import type { PartnerBrandingNoticeDto } from '@/lib/api/types';

// Shown when a code from a branded partner is applied. Checkout stays disabled until it is accepted.
export function PartnerBrandingNotice({
    notice,
    accepted,
    onChangeAction,
}: {
    notice: PartnerBrandingNoticeDto;
    accepted: boolean;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    const t = useTranslations('CheckoutReviewPage.partnerBranding');
    const partner = notice.displayName;

    return (
        <section className="rounded-lg border border-border bg-surface-muted/40 p-4" aria-labelledby="partner-branding-title">
            {/* Notice */}
            <h2 id="partner-branding-title" className="text-base font-bold text-ink">
                {t('title', { partner })}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t('body', { partner })}</p>

            {/* Acceptance */}
            <label className="mt-3 flex items-start gap-2.5 text-sm">
                <input type="checkbox" checked={accepted} onChange={onChangeAction} className="mt-0.5 h-4 w-4 shrink-0 rounded border-border" />
                <span className="font-semibold text-ink">{t('accept', { partner })}</span>
            </label>
            {!accepted && <p className="mt-2 text-xs font-semibold text-amber-700">{t('required')}</p>}
        </section>
    );
}
