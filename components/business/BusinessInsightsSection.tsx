'use client';

import { ChartNoAxesColumn } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { BusinessEmptyState } from '@/components/business/BusinessEmptyState';
import { BusinessNotice } from '@/components/business/BusinessNotice';
import { BusinessSectionIcon } from '@/components/business/BusinessSectionIcon';
import { BusinessTrendChart } from '@/components/business/BusinessTrendChart';
import { Button } from '@/components/ui/button';
import { MetricStrip } from '@/components/ui/MetricStrip';
import { VendorMeSection } from '@/components/vendors/me/VendorMeSection';
import type { BusinessOverviewDto } from '@/lib/api/types';
import { businessHasNumbers, businessInsightKeys } from '@/lib/business';
import { formatReachCount } from '@/lib/vendorReach';

// The vendor's numbers across their events. Partners see every count and the monthly chart; others see three, and the
// page's one "Become a partner" prompt when the server says to show it.
export function BusinessInsightsSection({
    overview,
    showPartnerPrompt,
    onBecomePartnerAction,
}: {
    overview: BusinessOverviewDto;
    showPartnerPrompt: boolean;
    onBecomePartnerAction: () => void;
}) {
    const t = useTranslations('BusinessPage.insights');
    const locale = useLocale();
    const items = businessInsightKeys(overview).map((key) => ({
        key,
        label: t(key),
        value: formatReachCount(locale, overview.totals[key] ?? 0),
    }));

    return (
        <VendorMeSection id="business-insights-title" title={t('title')} icon={<BusinessSectionIcon section="insights" />}>
            {businessHasNumbers(overview) ? (
                <>
                    {/* Counts */}
                    {/* Six counts sit in two rows of three: the main column is too narrow for one row of six. */}
                    <MetricStrip items={items} wrapLabels className={items.length === 6 ? 'sm:grid-cols-3' : undefined} />

                    {/* Trend */}
                    {overview.trend?.some((point) => point.views > 0) && <BusinessTrendChart trend={overview.trend} />}
                </>
            ) : (
                /* Empty */
                <BusinessEmptyState icon={ChartNoAxesColumn} title={t('emptyTitle')} body={t('emptyBody')} />
            )}

            {/* Partner invite */}
            {showPartnerPrompt && (
                <BusinessNotice
                    message={t('partnerPrompt')}
                    action={
                        <Button type="button" size="sm" onClick={onBecomePartnerAction} className="rounded-full">
                            {t('becomePartner')}
                        </Button>
                    }
                />
            )}
        </VendorMeSection>
    );
}
