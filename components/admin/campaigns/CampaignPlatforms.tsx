'use client';

import { useTranslations } from 'next-intl';

import { CampaignPlatformRow } from '@/components/admin/campaigns/CampaignPlatformRow';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import type { CampaignPlatformRowData, VerdictMeasure } from '@/lib/campaignCompare';

const HEAD = 'px-3 py-2';

// A campaign's platforms, busiest first. A platform with several links opens to them.
export function CampaignPlatforms({ rows, measure }: { rows: CampaignPlatformRowData[]; measure: VerdictMeasure }) {
    const t = useTranslations('AdminPage.campaigns');
    const rateTitle = measure === 'sales' ? t('platforms.salesRate') : t('platforms.signUpRate');

    return (
        <FunnelGroup title={t('platforms.title')} window="visit">
            <table className="block w-full text-sm sm:table">
                {/* Columns */}
                <thead className="hidden text-xs font-semibold text-ink-muted sm:table-header-group">
                    <tr>
                        <th scope="col" className="w-48 py-2 pr-3 text-left">
                            <span className="sr-only">{t('platforms.title')}</span>
                        </th>
                        <th scope="col" className={`${HEAD} text-left`}>
                            {t('columns.visitors')}
                        </th>
                        <th scope="col" className={`${HEAD} text-right`}>
                            {t('columns.signedUp')}
                        </th>
                        <th scope="col" className={`${HEAD} text-right`}>
                            {t('columns.sales')}
                        </th>
                        <th scope="col" className="py-2 pl-3 text-left">
                            {rateTitle}
                        </th>
                    </tr>
                </thead>

                {/* Platforms */}
                {rows.map((row) => (
                    <CampaignPlatformRow key={row.platform} row={row} rateTitle={rateTitle} />
                ))}
            </table>
        </FunnelGroup>
    );
}
