'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DiscountCampaignDrawer } from '@/components/admin/discountCampaigns/DiscountCampaignDrawer';
import { DiscountCampaignsTable } from '@/components/admin/discountCampaigns/DiscountCampaignsTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useDiscountCampaignsPanel } from '@/hooks/useDiscountCampaignsPanel';
import { adminErrorMessageKey } from '@/lib/adminUtils';

// One switch that discounts every plan (spec 2026-11-03-discount-campaigns-design).
export function DiscountCampaignsPanel() {
    const t = useTranslations('AdminPage');
    const { query, campaigns, drawer, handleCreateClick, handleEditClick, closeDrawer } = useDiscountCampaignsPanel();

    return (
        <section className="space-y-4">
            {/* Header */}
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleCreateClick}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white"
                >
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    {t('discountCampaigns.create')}
                </button>
            </div>

            {/* List */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
                {query.isLoading && <LoadingState className="justify-start px-4 py-6" />}
                {query.error && <p className="px-4 py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(query.error)}`)}</p>}
                {!query.isLoading && !query.error && campaigns.length === 0 && (
                    <p className="px-4 py-6 text-sm text-ink-muted">{t('discountCampaigns.empty')}</p>
                )}
                {campaigns.length > 0 && <DiscountCampaignsTable campaigns={campaigns} onEditAction={handleEditClick} />}
            </section>

            {/* Drawer */}
            <DiscountCampaignDrawer key={drawer.token} open={drawer.open} campaign={drawer.campaign} onCloseAction={closeDrawer} />
        </section>
    );
}
