'use client';

import { useTranslations } from 'next-intl';

import { CampaignLinkTypeIcon } from '@/components/admin/campaigns/CampaignLinkTypeIcon';
import { CampaignPlatformIcon } from '@/components/admin/campaigns/CampaignPlatformIcon';
import { CAMPAIGN_PLATFORM_PRESETS, type CampaignLinkLabelParts } from '@/lib/campaignLinks';

// A link in a few marks: platform, type, a partner's or source's name, language and page. Under its
// platform's row the platform icon is left out, and only a screen reader hears the platform's name.
// Each icon shows its word on hover, focus or tap; `decorative` draws them plain, for a label inside a
// control (a link row) that names the link and carries the tip itself.
export function CampaignLinkLabel({
    label,
    showPlatform = true,
    decorative = false,
}: {
    label: CampaignLinkLabelParts;
    showPlatform?: boolean;
    decorative?: boolean;
}) {
    const t = useTranslations('AdminPage.campaigns');

    return (
        <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
            {/* Platform */}
            {showPlatform ? (
                <CampaignPlatformIcon platform={label.platform} decorative={decorative} />
            ) : (
                <span className="sr-only">{t(`presets.${CAMPAIGN_PLATFORM_PRESETS[label.platform]}`)}</span>
            )}

            {/* Type */}
            {label.type && <CampaignLinkTypeIcon type={label.type} decorative={decorative} />}

            {/* Partner or source */}
            {label.text && <span className="truncate font-mono text-xs text-ink">{label.text}</span>}

            {/* Language */}
            {label.language && (
                <span className="rounded bg-status-neutral-wash px-1.5 py-0.5 font-mono text-[10px] font-bold text-status-neutral">
                    {t(`languages.${label.language}`)}
                </span>
            )}

            {/* Page */}
            {label.page && <span className="truncate font-mono text-xs text-ink-muted">{label.page}</span>}
        </span>
    );
}
