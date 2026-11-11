'use client';

import { useTranslations } from 'next-intl';
import { createElement } from 'react';

import { AdminIconTip } from '@/components/admin/AdminIconTip';
import { CAMPAIGN_PLATFORM_COLORS, CAMPAIGN_PLATFORM_ICONS } from '@/lib/campaignIcons';
import { CAMPAIGN_PLATFORM_PRESETS, type CampaignPlatform } from '@/lib/campaignLinks';
import { cn } from '@/lib/utils';

// A platform's logo in its color. Its name is the icon's name and shows on hover, focus or tap, unless
// `decorative`, where the control around it already carries the name and the tip.
export function CampaignPlatformIcon({
    platform,
    className,
    decorative = false,
}: {
    platform: CampaignPlatform;
    className?: string;
    decorative?: boolean;
}) {
    const t = useTranslations('AdminPage.campaigns.presets');
    const icon = createElement(CAMPAIGN_PLATFORM_ICONS[platform], {
        'aria-hidden': true,
        className: cn('h-4 w-4 shrink-0', CAMPAIGN_PLATFORM_COLORS[platform], className),
    });
    if (decorative) return icon;

    return <AdminIconTip label={t(CAMPAIGN_PLATFORM_PRESETS[platform])}>{icon}</AdminIconTip>;
}
