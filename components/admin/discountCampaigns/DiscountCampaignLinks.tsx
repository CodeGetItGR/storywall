'use client';

import { useTranslations } from 'next-intl';

import { CampaignSectionLabel } from '@/components/admin/campaigns/CampaignSectionLabel';
import { CampaignValueLabel } from '@/components/admin/campaigns/CampaignValueTip';
import { CampaignSetLinkRow } from '@/components/admin/discountCampaigns/CampaignSetLinkRow';
import { FunnelSegmented } from '@/components/admin/funnel/FunnelSegmented';
import { LoadingState } from '@/components/ui/LoadingState';
import { useDiscountCampaignLinks } from '@/hooks/useDiscountCampaignLinks';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { AdminDiscountCampaignDto } from '@/lib/api/types';
import { campaignRowKey } from '@/lib/campaignLinks';

const BUTTON = 'min-h-9 rounded-md border border-border px-3 text-sm font-semibold text-ink-muted disabled:opacity-50';

// A saved discount campaign's links in one language with their visits, and the button that creates what
// that language is missing.
export function DiscountCampaignLinks({ campaign }: { campaign: AdminDiscountCampaignDto }) {
    const t = useTranslations('AdminPage');
    const format = useFunnelFormat();
    const { language, rows, sections, total, over, hasLinks, missingLinks, isLoading, busy, error, handleLanguageChange, handleGenerateClick } =
        useDiscountCampaignLinks(campaign);
    const languages = [
        { value: 'en', label: t('discountCampaigns.links.languages.en') },
        { value: 'el', label: t('discountCampaigns.links.languages.el') },
    ] as const;

    return (
        <section className="space-y-3">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('discountCampaigns.links.title')}</h3>
                <div className="flex flex-wrap items-center gap-2">
                    {missingLinks && (
                        <button type="button" onClick={handleGenerateClick} disabled={busy} className={BUTTON}>
                            {t(language === 'en' ? 'discountCampaigns.links.english' : 'discountCampaigns.links.greek')}
                        </button>
                    )}
                    {(!over || hasLinks) && (
                        <FunnelSegmented
                            label={t('campaignOverview.splits.language')}
                            options={languages}
                            value={language}
                            onChangeAction={handleLanguageChange}
                        />
                    )}
                </div>
            </div>

            {/* Over */}
            {over && hasLinks && <p className="text-sm text-status-warn">{t('discountCampaigns.links.over')}</p>}

            {/* List */}
            {isLoading && <LoadingState className="justify-start py-2" />}
            {rows.length > 0 && (
                // Scrolls by itself, so the names keep their width at phone size.
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
                        <thead>
                            <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                <th className="min-w-44 py-2 pr-3 font-bold">{t('discountCampaigns.columns.name')}</th>
                                <th className="px-3 py-2 text-right font-bold">
                                    <CampaignValueLabel value="visits" label={t('discountCampaigns.links.visits')} />
                                </th>
                                <th className="px-3 py-2 text-right font-bold">
                                    <CampaignValueLabel value="sales" label={t('discountCampaigns.links.sales')} />
                                </th>
                                <th className="px-3 py-2 text-right font-bold whitespace-nowrap">
                                    <CampaignValueLabel value="salesRevenue" label={t('discountCampaigns.links.salesRevenue')} />
                                </th>
                                <th className="w-8 py-2 pl-3" />
                            </tr>
                        </thead>

                        {/* Sections */}
                        {sections.map((section) => (
                            <tbody key={section.group}>
                                <tr>
                                    <th
                                        colSpan={5}
                                        scope="colgroup"
                                        className="pt-4 pb-2 text-[11px] font-bold tracking-wide text-ink-muted uppercase"
                                    >
                                        <CampaignSectionLabel group={section.group} />
                                    </th>
                                </tr>
                                {section.rows.map((row) => (
                                    <CampaignSetLinkRow key={campaignRowKey(row)} row={row} />
                                ))}
                            </tbody>
                        ))}

                        {/* Total */}
                        {rows.length > 1 && (
                            <tfoot>
                                <tr className="border-t border-border font-semibold">
                                    <th scope="row" className="py-2 pr-3 text-left">
                                        {t('discountCampaigns.links.total')}
                                    </th>
                                    <td className="px-3 py-2 text-right font-mono tabular-nums">{format.count(total.visits)}</td>
                                    <td className="px-3 py-2 text-right font-mono tabular-nums">{format.count(total.sales)}</td>
                                    <td className="px-3 py-2 text-right font-mono whitespace-nowrap tabular-nums">
                                        {format.moneyByCurrency(total.salesRevenueMinorByCurrency)}
                                    </td>
                                    <td />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
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
