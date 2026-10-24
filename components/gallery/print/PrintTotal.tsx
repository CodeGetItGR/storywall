'use client';

import { useLocale, useTranslations } from 'next-intl';

import { formatMoney } from '@/lib/billing';
import type { PrintTotals } from '@/lib/printPicks';

// "12 of 40 included · 3 more · €9.00" for a host, "3 more · €9.00" for a guest.
export function PrintTotal({ totals }: { totals: PrintTotals }) {
    const t = useTranslations('GalleryPage.print');
    const locale = useLocale();
    const parts = [
        totals.included !== null && t('included', { used: Math.min(totals.prints, totals.included), included: totals.included }),
        totals.beyond > 0 && t('beyond', { count: totals.beyond }),
        totals.beyond > 0 && (totals.priceCents === null ? t('noPrice') : formatMoney(locale, totals.priceCents, 'EUR')),
    ].filter(Boolean);

    return <p className="text-sm font-semibold text-ink">{parts.join(' · ')}</p>;
}
