'use client';

import { useLocale, useTranslations } from 'next-intl';

import { MetricStrip } from '@/components/ui/MetricStrip';
import { VENDOR_SECTION_SURFACE } from '@/components/vendors/me/VendorMeSection';
import type { PartnerPortalReachDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import { formatReachCount } from '@/lib/vendorReach';

const TOTALS = ['guests', 'proViews', 'postViewers', 'listTaps'] as const;

// The partner's reach across their events as a vendor. Rows carry a date and a type, never an event's name (KAN-28).
export function PartnerReachSection({ reach }: { reach: PartnerPortalReachDto }) {
    const t = useTranslations('PartnerPortalPage.reach');
    const tVendors = useTranslations('Vendors');
    const locale = useLocale();

    return (
        <section aria-labelledby="partner-reach-title" className={cn(VENDOR_SECTION_SURFACE, 'p-5 sm:p-6')}>
            {/* Header */}
            <div className="flex items-baseline justify-between gap-3">
                <h2 id="partner-reach-title" className="text-base font-semibold text-ink">
                    {t('title')}
                </h2>
                {reach.events > 0 && <p className="text-sm text-ink-muted">{t('eventCount', { count: reach.events })}</p>}
            </div>

            {reach.events === 0 ? (
                <p className="mt-2 text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <>
                    {/* Totals */}
                    <MetricStrip
                        className="mt-4"
                        wrapLabels
                        items={TOTALS.map((key) => ({ key, label: t(key), value: formatReachCount(locale, reach[key]) }))}
                    />

                    {/* Recent events */}
                    <h3 className="mt-6 text-sm font-semibold text-ink">{t('recentTitle')}</h3>
                    <ul className="mt-1 divide-y divide-border">
                        {reach.recent.map((row, i) => (
                            <li key={`${row.startAt}-${i}`} className="flex items-center justify-between gap-4 py-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-ink">{formatDate(locale, row.startAt, { dateStyle: 'medium' })}</p>
                                    <p className="truncate text-xs text-ink-muted">{tVendors(`types.${row.vendorType}`)}</p>
                                </div>
                                <div className="shrink-0 text-right tabular-nums">
                                    <p className="text-sm font-semibold text-ink">{t('rowViews', { count: row.views })}</p>
                                    <p className="text-xs text-ink-muted">{t('rowGuests', { count: row.guests })}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    );
}
