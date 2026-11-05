'use client';

import { useTranslations } from 'next-intl';

import { CAMPAIGN_SECTION_ICONS } from '@/lib/campaignIcons';
import type { CampaignPresetGroup } from '@/lib/campaignLinks';

// A section's icon and name, inside its heading cell.
export function CampaignSectionLabel({ group }: { group: CampaignPresetGroup }) {
    const t = useTranslations('AdminPage.campaigns.presetGroups');
    const Icon = CAMPAIGN_SECTION_ICONS[group];

    return (
        <span className="inline-flex items-center gap-1.5">
            <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            {t(group)}
        </span>
    );
}
