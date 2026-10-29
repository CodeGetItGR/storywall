'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CampaignLinkCreateDrawer } from '@/components/admin/campaigns/CampaignLinkCreateDrawer';
import { CampaignLinkDrawer } from '@/components/admin/campaigns/CampaignLinkDrawer';
import { CampaignsTable } from '@/components/admin/campaigns/CampaignsTable';
import { FunnelHeader } from '@/components/admin/funnel/FunnelHeader';
import { FunnelRangeControl } from '@/components/admin/funnel/FunnelRangeControl';
import { LoadingState } from '@/components/ui/LoadingState';
import { useCampaignsDashboard } from '@/hooks/useCampaignsDashboard';
import { adminErrorMessageKey } from '@/lib/adminUtils';

// Sign-ups per campaign, and the links made with the campaign link builder.
export function CampaignsPanel() {
    const t = useTranslations('AdminPage');
    const d = useCampaignsDashboard();

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <FunnelHeader title={t('campaigns.title')} updatedAt={d.updatedAt} isFetching={d.isFetching} onRefreshAction={d.refresh} />

            <div className="space-y-5">
                {/* Range and action */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <FunnelRangeControl range={d.range} note={t('campaigns.rangeNote')} />
                    <button
                        type="button"
                        onClick={d.handleCreateClick}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
                    >
                        <Plus aria-hidden="true" className="h-4 w-4" />
                        {t('campaigns.create')}
                    </button>
                </div>

                {/* Table */}
                <section className="overflow-hidden rounded-xl border border-border bg-card">
                    {d.isLoading && <LoadingState className="justify-start px-4 py-6" />}
                    {Boolean(d.error) && <p className="px-4 py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(d.error)}`)}</p>}
                    {d.hasData && d.rows.length === 0 && <p className="px-4 py-6 text-sm text-ink-muted">{t('campaigns.empty')}</p>}
                    {d.rows.length > 0 && <CampaignsTable rows={d.rows} onLinkAction={d.handleLinkClick} />}
                </section>
            </div>

            {/* Drawers */}
            {d.drawer.link ? (
                <CampaignLinkDrawer
                    key={d.drawer.token}
                    open={d.drawer.open}
                    link={d.drawer.link}
                    bounds={d.range.bounds}
                    onCloseAction={d.closeDrawer}
                />
            ) : (
                <CampaignLinkCreateDrawer key={d.drawer.token} open={d.drawer.open} onCloseAction={d.closeDrawer} />
            )}
        </div>
    );
}
