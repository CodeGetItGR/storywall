'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import {
    CAMPAIGN_PLATFORM_PRESETS,
    type CampaignLinkLabelParts,
    type CampaignLinkType,
    type CampaignPlacementOption,
    type CampaignPlatform,
} from '@/lib/campaignLinks';

// A placement or a link in words, from the approved platform, type and language names: the hover text
// of a picker chip, and the accessible name of a link row and its copy button ("Instagram Story ad
// EL"). Google Ads is only ever a search ad, so its type isn't said.
export function useCampaignLinkWords() {
    const t = useTranslations('AdminPage.campaigns');

    const platform = useCallback((value: CampaignPlatform) => t(`presets.${CAMPAIGN_PLATFORM_PRESETS[value]}`), [t]);

    const typeWord = useCallback(
        (value: CampaignPlatform, type: CampaignLinkType | null) => (type && value !== 'google' ? t(`linkTypes.${type}`) : null),
        [t],
    );

    const placement = useCallback(
        (option: CampaignPlacementOption) => [platform(option.platform), typeWord(option.platform, option.type)].filter(Boolean).join(' '),
        [platform, typeWord],
    );

    const link = useCallback(
        (label: CampaignLinkLabelParts) =>
            [
                platform(label.platform),
                typeWord(label.platform, label.type),
                label.text,
                label.language ? t(`languages.${label.language}`) : null,
                label.page,
            ]
                .filter(Boolean)
                .join(' '),
        [platform, t, typeWord],
    );

    return { platform, placement, link };
}
