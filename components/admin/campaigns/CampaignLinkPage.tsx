'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { CampaignLinkShare } from '@/components/admin/campaigns/CampaignLinkShare';
import { CampaignLinkStats } from '@/components/admin/campaigns/CampaignLinkStats';
import { CampaignPlatformIcon } from '@/components/admin/campaigns/CampaignPlatformIcon';
import { BackButton } from '@/components/ui/BackButton';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useCampaignLinkDetail } from '@/hooks/useCampaignLinkDetail';
import type { FunnelBounds } from '@/lib/adminFunnel';
import { CAMPAIGNS_HASH_ROOT } from '@/lib/adminRecordRouting';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CampaignLinkDto } from '@/lib/api/types';
import { CAMPAIGN_NAME_MAX, campaignLinkPlatform } from '@/lib/campaignLinks';

// One saved link's page: its numbers, its short address, and its name, the only thing that can change.
export function CampaignLinkPage({
    link,
    bounds,
    onBackAction,
    onDoneAction,
}: {
    link: CampaignLinkDto;
    bounds: FunnelBounds;
    onBackAction: (event: MouseEvent<HTMLAnchorElement>) => void;
    onDoneAction: () => void;
}) {
    const t = useTranslations('AdminPage');
    const f = useCampaignLinkDetail(link, onDoneAction);

    return (
        <div className="space-y-6">
            {/* Back */}
            <BackButton href={CAMPAIGNS_HASH_ROOT} label={t('campaigns.back')} onClick={onBackAction} />

            {/* Header */}
            <div className="flex items-center gap-3">
                <CampaignPlatformIcon platform={campaignLinkPlatform(link)} className="h-6 w-6" decorative />
                <h2 className="min-w-0 text-2xl font-extrabold tracking-tight break-words text-ink sm:text-3xl">{link.name}</h2>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-2 lg:items-start">
                <form onSubmit={f.handleSubmit} className="space-y-5">
                    {/* Name */}
                    <AdminField label={t('campaigns.fields.name')} required hint={`${f.name.length}/${CAMPAIGN_NAME_MAX}`}>
                        <input
                            name="name"
                            aria-label={t('campaigns.fields.name')}
                            className={adminInputClass()}
                            maxLength={CAMPAIGN_NAME_MAX}
                            value={f.name}
                            onChange={f.handleNameChange}
                        />
                    </AdminField>

                    {/* Values */}
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                        <dt className="text-ink-muted">{t('campaigns.fields.page')}</dt>
                        <dd className="font-mono text-xs leading-5 text-ink">{link.destinationPath}</dd>
                        <dt className="text-ink-muted">{t('campaigns.fields.source')}</dt>
                        <dd className="font-mono text-xs leading-5 text-ink">{link.utmSource}</dd>
                        <dt className="text-ink-muted">{t('campaigns.fields.medium')}</dt>
                        <dd className="font-mono text-xs leading-5 text-ink">{link.utmMedium}</dd>
                        <dt className="text-ink-muted">{t('campaigns.fields.campaign')}</dt>
                        <dd className="font-mono text-xs leading-5 text-ink">{link.utmCampaign}</dd>
                    </dl>

                    {/* Link */}
                    <CampaignLinkShare url={f.url} fileName={link.utmCampaign} />

                    {/* Errors */}
                    {f.nameProblem && <p className="text-sm text-status-danger">{t('campaigns.problems.name')}</p>}
                    {f.error !== null && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(f.error)}`)}</p>}

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={f.openDeleteConfirmation}
                            disabled={f.busy}
                            className="min-h-9 rounded-md px-3.5 text-sm font-semibold text-status-danger disabled:opacity-50"
                        >
                            {t('campaigns.delete')}
                        </button>
                        <button
                            type="submit"
                            disabled={f.busy}
                            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {f.busy && !f.deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            {t('save')}
                        </button>
                    </div>
                </form>

                {/* Stats */}
                <CampaignLinkStats linkId={link.id} bounds={bounds} />
            </div>

            <ConfirmActionModal
                open={f.confirmDelete}
                title={t('campaigns.deleteTitle')}
                body={t('campaigns.deleteBody')}
                confirmLabel={t('campaigns.deleteConfirm')}
                cancelLabel={t('cancel')}
                tone="danger"
                isConfirming={f.deleting}
                onCloseAction={f.closeDeleteConfirmation}
                onConfirmAction={f.confirmDeletion}
                icon={f.deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </div>
    );
}
