'use client';

import { useTranslations } from 'next-intl';

import { CampaignSetLinkRow } from '@/components/admin/discountCampaigns/CampaignSetLinkRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { useDiscountCampaignLinks } from '@/hooks/useDiscountCampaignLinks';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { AdminDiscountCampaignDto } from '@/lib/api/types';
import { campaignRowKey } from '@/lib/campaignLinks';

const BUTTON = 'min-h-9 rounded-md border border-border px-3 text-sm font-semibold text-ink-muted disabled:opacity-50';

// A saved discount campaign's links with their visits, and the buttons that create each language's set.
export function DiscountCampaignLinks({ campaign }: { campaign: AdminDiscountCampaignDto }) {
    const t = useTranslations('AdminPage');
    const { rows, over, isLoading, busy, error, handleGenerateClick } = useDiscountCampaignLinks(campaign);

    return (
        <section className="space-y-3">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('discountCampaigns.links.title')}</h3>
                {!over && (
                    <div className="flex gap-2">
                        <button type="button" data-language="en" onClick={handleGenerateClick} disabled={busy} className={BUTTON}>
                            {t('discountCampaigns.links.english')}
                        </button>
                        <button type="button" data-language="el" onClick={handleGenerateClick} disabled={busy} className={BUTTON}>
                            {t('discountCampaigns.links.greek')}
                        </button>
                    </div>
                )}
            </div>

            {/* Over */}
            {over && rows.length > 0 && <p className="text-sm text-status-warn">{t('discountCampaigns.links.over')}</p>}

            {/* List */}
            {isLoading && <LoadingState className="justify-start py-2" />}
            {rows.length > 0 && (
                <table className="w-full border-collapse text-left text-sm">
                    <thead>
                        <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                            <th className="py-2 pr-3 font-bold">{t('discountCampaigns.columns.name')}</th>
                            <th className="px-3 py-2 text-right font-bold">{t('discountCampaigns.links.visits')}</th>
                            <th className="w-8 py-2 pl-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <CampaignSetLinkRow key={campaignRowKey(row)} row={row} />
                        ))}
                    </tbody>
                </table>
            )}

            {/* Errors */}
            {Boolean(error) && (
                <p role="alert" className="text-sm text-status-danger">
                    {t(`errors.${adminErrorMessageKey(error)}`)}
                </p>
            )}
        </section>
    );
}
