'use client';

import { useTranslations } from 'next-intl';

import { FunnelBreakdown } from '@/components/admin/funnel/FunnelBreakdown';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { deviceRows, languageRows } from '@/lib/adminVisitors';
import type { CampaignOverviewDto } from '@/lib/api/types';

export function CampaignSplits({ data }: { data: CampaignOverviewDto }) {
    const t = useTranslations('AdminPage.campaignOverview.splits');
    const v = useTranslations('AdminPage.visitors');

    return (
        <FunnelGroup title={t('title')} window="visit">
            <div className="grid gap-5 @xl:grid-cols-2">
                {/* Language */}
                <FunnelBreakdown
                    title={t('language')}
                    rows={languageRows(data.languages)}
                    labels={{ el: v('languages.el'), en: v('languages.en') }}
                />
                {/* Device */}
                <FunnelBreakdown
                    title={t('device')}
                    rows={deviceRows(data.devices)}
                    labels={{ PHONE: v('devices.PHONE'), DESKTOP: v('devices.DESKTOP'), TABLET: v('devices.TABLET') }}
                />
            </div>
        </FunnelGroup>
    );
}
