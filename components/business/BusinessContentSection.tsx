'use client';

import { useLocale, useTranslations } from 'next-intl';

import { BusinessSectionIcon } from '@/components/business/BusinessSectionIcon';
import { MetricStrip } from '@/components/ui/MetricStrip';
import { VendorMeSection } from '@/components/vendors/me/VendorMeSection';
import type { BusinessOverviewDto } from '@/lib/api/types';
import { formatBytes } from '@/lib/format';
import { formatReachCount } from '@/lib/vendorReach';

// What the vendor posted across their events.
export function BusinessContentSection({ content }: { content: NonNullable<BusinessOverviewDto['content']> }) {
    const t = useTranslations('BusinessPage.content');
    const tSneakPeek = useTranslations('Vendors.sneakPeek');
    const locale = useLocale();

    return (
        <VendorMeSection id="business-content-title" title={t('title')} icon={<BusinessSectionIcon section="content" />}>
            {/* Counts */}
            <MetricStrip
                wrapLabels
                items={[
                    { key: 'proItems', label: t('proItems'), value: formatReachCount(locale, content.proItems) },
                    { key: 'sneakPeeks', label: tSneakPeek('title'), value: formatReachCount(locale, content.sneakPeeks) },
                    { key: 'storage', label: t('storage'), value: formatBytes(content.proUsedBytes) },
                ]}
            />
        </VendorMeSection>
    );
}
