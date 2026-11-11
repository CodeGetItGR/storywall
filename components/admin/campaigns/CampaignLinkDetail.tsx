'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { CAMPAIGN_DANGER_BUTTON, CAMPAIGN_SECONDARY_BUTTON } from '@/components/admin/campaigns/campaignButtons';
import { CampaignLinkLabel } from '@/components/admin/campaigns/CampaignLinkLabel';
import { CampaignLinkShare } from '@/components/admin/campaigns/CampaignLinkShare';
import type { CampaignLinkRow } from '@/hooks/useCampaignLinks';
import type { CampaignDto } from '@/lib/api/types';

// One link, opened in the links drawer: its address to copy or print, moving it to another campaign,
// and deleting it.
export function CampaignLinkDetail({
    row,
    moveOptions,
    moveTarget,
    busy,
    onBackAction,
    onMoveTargetChangeAction,
    onMoveAction,
    onDeleteAction,
}: {
    row: CampaignLinkRow;
    moveOptions: readonly CampaignDto[];
    moveTarget: string;
    busy: boolean;
    onBackAction: () => void;
    onMoveTargetChangeAction: (event: ChangeEvent<HTMLSelectElement>) => void;
    onMoveAction: () => void;
    onDeleteAction: () => void;
}) {
    const t = useTranslations('AdminPage.campaigns');

    return (
        <div className="space-y-6">
            {/* Back to the links */}
            <button
                type="button"
                onClick={onBackAction}
                className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink"
            >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                {t('linksDrawer.title')}
            </button>

            {/* Link */}
            <div className="space-y-3">
                <CampaignLinkLabel label={row.label} />
                <CampaignLinkShare url={row.url} fileName={row.link.shortCode} />
            </div>

            {/* Move */}
            {moveOptions.length > 0 && (
                <div className="flex items-end gap-2">
                    <AdminField label={t('fields.campaign')} className="min-w-0 flex-1">
                        <select
                            aria-label={t('fields.campaign')}
                            className={adminInputClass()}
                            value={moveTarget}
                            onChange={onMoveTargetChangeAction}
                        >
                            {moveOptions.map((campaign) => (
                                <option key={campaign.id} value={campaign.id}>
                                    {campaign.name}
                                </option>
                            ))}
                        </select>
                    </AdminField>
                    <button type="button" onClick={onMoveAction} disabled={busy} className={CAMPAIGN_SECONDARY_BUTTON}>
                        {t('linksDrawer.move')}
                    </button>
                </div>
            )}

            {/* Delete */}
            <div className="border-t border-border pt-4">
                <button type="button" onClick={onDeleteAction} disabled={busy} className={CAMPAIGN_DANGER_BUTTON}>
                    {t('delete')}
                </button>
            </div>
        </div>
    );
}
