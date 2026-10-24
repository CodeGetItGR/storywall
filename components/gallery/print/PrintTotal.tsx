'use client';

import { useLocale, useTranslations } from 'next-intl';

import { formatMoney } from '@/lib/billing';
import type { PrintTotalPart, PrintTotals } from '@/lib/printPicks';
import { printTotalParts } from '@/lib/printPicks';

// Print sizes are priced in euros only: the backend gives every size the EUR default and its requests carry no currency.
const PRINT_CURRENCY = 'EUR';

// "12 of 40 included · 3 more · €9.00" for a host, "3 more · €9.00" for a guest.
export function PrintTotal({ totals, withIncluded = true }: { totals: PrintTotals; withIncluded?: boolean }) {
    const t = useTranslations('GalleryPage.print');
    const locale = useLocale();

    function partText(part: PrintTotalPart): string {
        if (part.key === 'included') return t('included', { used: part.used, included: part.included });
        if (part.key === 'beyond') return t('beyond', { count: part.count });
        return part.cents === null ? t('noPrice') : formatMoney(locale, part.cents, PRINT_CURRENCY);
    }

    const parts = printTotalParts(totals, { withIncluded });
    if (parts.length === 0) return null;

    return <p className="text-sm font-semibold text-ink">{parts.map(partText).join(' · ')}</p>;
}
