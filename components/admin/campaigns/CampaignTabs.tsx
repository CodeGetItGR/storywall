'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { FunnelSegmented } from '@/components/admin/funnel/FunnelSegmented';
import type { CampaignTab } from '@/lib/campaignCompare';

export function CampaignTabs({ tab, onChangeAction }: { tab: CampaignTab; onChangeAction: (tab: CampaignTab) => void }) {
    const t = useTranslations('AdminPage.campaigns');
    const options = useMemo(
        () => [
            { value: 'current' as const, label: t('tabs.current') },
            { value: 'past' as const, label: t('tabs.past') },
        ],
        [t],
    );

    return <FunnelSegmented label={t('title')} options={options} value={tab} onChangeAction={onChangeAction} />;
}
