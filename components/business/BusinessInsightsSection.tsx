'use client';

import { useLocale, useTranslations } from 'next-intl';

import { BusinessSectionIcon } from '@/components/business/BusinessSectionIcon';
import { BusinessTrendChart } from '@/components/business/BusinessTrendChart';
import { Button } from '@/components/ui/button';
import { MetricStrip } from '@/components/ui/MetricStrip';
import { VendorMeSection } from '@/components/vendors/me/VendorMeSection';
import type { BusinessOverviewDto } from '@/lib/api/types';
import { businessInsightKeys } from '@/lib/business';
import { formatReachCount } from '@/lib/vendorReach';

// The vendor's numbers across their events. Partners see every count and the monthly chart; others see three and an invite.
export function BusinessInsightsSection({ overview, onBecomePartnerAction }: { overview: BusinessOverviewDto; onBecomePartnerAction: () => void }) {
    const t = useTranslations('BusinessPage.insights');
    const locale = useLocale();
    const items = businessInsightKeys(overview).map((key) => ({
        key,
        label: t(key),
        value: formatReachCount(locale, overview.totals[key] ?? 0),
    }));

    return (
        <VendorMeSection id="business-insights-title" title={t('title')} icon={<BusinessSectionIcon section="insights" />}>
            {/* Counts */}
            <MetricStrip items={items} wrapLabels />

            {/* Trend */}
            {overview.trend && <BusinessTrendChart trend={overview.trend} />}

            {/* Partner invite */}
            {!overview.partner && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3">
                    <p className="text-sm text-ink-muted">{t('partnerPrompt')}</p>
                    <Button type="button" size="sm" onClick={onBecomePartnerAction} className="rounded-full">
                        {t('becomePartner')}
                    </Button>
                </div>
            )}
        </VendorMeSection>
    );
}
