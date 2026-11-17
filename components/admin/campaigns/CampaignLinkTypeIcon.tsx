'use client';

import { Megaphone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createElement } from 'react';

import { AdminIconTip } from '@/components/admin/AdminIconTip';
import { CAMPAIGN_LINK_TYPE_ICONS } from '@/lib/campaignIcons';
import type { CampaignLinkType } from '@/lib/campaignLinks';

const AD_TYPES: ReadonlySet<CampaignLinkType> = new Set(['postAd', 'storyAd']);

// A link's type as an icon: a square post, a tall story, a magnifier for a search ad, and a megaphone
// beside a paid post or story. The word is the icon's name and shows on hover, focus or tap, unless
// `decorative`, where the control around it already says it.
export function CampaignLinkTypeIcon({ type, decorative = false }: { type: CampaignLinkType; decorative?: boolean }) {
    const t = useTranslations('AdminPage.campaigns.linkTypes');
    const icon = (
        <>
            {createElement(CAMPAIGN_LINK_TYPE_ICONS[type], { 'aria-hidden': true, className: 'h-3.5 w-3.5' })}
            {AD_TYPES.has(type) && <Megaphone aria-hidden="true" className="h-3 w-3" />}
        </>
    );

    if (decorative) {
        return (
            <span aria-hidden="true" className="inline-flex shrink-0 items-center gap-0.5 text-ink-muted">
                {icon}
            </span>
        );
    }
    return (
        <AdminIconTip label={t(type)} className="gap-0.5 text-ink-muted">
            {icon}
        </AdminIconTip>
    );
}
