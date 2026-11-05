'use client';

import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { CampaignLinkCopyButton } from '@/components/admin/campaigns/CampaignLinkCopyButton';
import { CampaignPlatformIcon } from '@/components/admin/campaigns/CampaignPlatformIcon';
import { CampaignSectionLabel } from '@/components/admin/campaigns/CampaignSectionLabel';
import { CampaignValueLabel } from '@/components/admin/campaigns/CampaignValueTip';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { EMPTY_VALUE } from '@/lib/adminFunnel';
import { CAMPAIGNS_HASH_ROOT, formatRecordHash } from '@/lib/adminRecordRouting';
import type { CampaignRowDto } from '@/lib/api/types';
import { campaignLinkSections, campaignRowKey } from '@/lib/campaignLinks';

// Name, source / medium, campaign, nine counts and, for an admin, two revenue columns.
const BASE_COLUMNS = 12;

export function CampaignsTable({
    rows,
    onLinkAction,
    onRowAction,
}: {
    rows: CampaignRowDto[];
    onLinkAction: (event: MouseEvent<HTMLAnchorElement>) => void;
    onRowAction: (event: MouseEvent<HTMLTableRowElement>) => void;
}) {
    const t = useTranslations('AdminPage.campaigns');
    const format = useFunnelFormat();
    // Marketing gets the rows without revenue, so the column goes.
    const showRevenue = rows.every((row) => row.revenueMinorByCurrency !== null);
    const sections = campaignLinkSections(rows);

    return (
        <div className="overflow-x-auto">
            <table aria-label={t('title')} className="w-full min-w-[1380px] border-collapse text-left text-sm">
                {/* Columns */}
                <thead>
                    <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="min-w-80 px-4 py-3 font-bold">{t('columns.name')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.source')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.campaign')}</th>
                        <th className="px-3 py-3 text-right font-bold">
                            <CampaignValueLabel value="visits" label={t('columns.visits')} />
                        </th>
                        <th className="px-3 py-3 text-right font-bold">
                            <CampaignValueLabel value="visitors" label={t('columns.visitors')} />
                        </th>
                        <th className="px-3 py-3 text-right font-bold">
                            <CampaignValueLabel value="createClicks" label={t('columns.createClicks')} />
                        </th>
                        <th className="px-3 py-3 text-right font-bold">
                            <CampaignValueLabel value="plansClicks" label={t('columns.plansClicks')} />
                        </th>
                        <th className="px-3 py-3 text-right font-bold">
                            <CampaignValueLabel value="planPicks" label={t('columns.planPicks')} />
                        </th>
                        <th className="px-3 py-3 text-right font-bold">
                            <CampaignValueLabel value="signedUp" label={t('columns.signedUp')} />
                        </th>
                        <th className="px-3 py-3 text-right font-bold">
                            <CampaignValueLabel value="createdEvent" label={t('columns.createdEvent')} />
                        </th>
                        <th className="px-3 py-3 text-right font-bold">
                            <CampaignValueLabel value="paidHost" label={t('columns.paidHost')} />
                        </th>
                        {showRevenue && (
                            <th className="px-4 py-3 text-right font-bold">
                                <CampaignValueLabel value="revenue" label={t('columns.revenue')} />
                            </th>
                        )}
                        <th className="px-3 py-3 text-right font-bold">
                            <CampaignValueLabel value="sales" label={t('columns.sales')} />
                        </th>
                        {showRevenue && (
                            <th className="px-4 py-3 text-right font-bold">
                                <CampaignValueLabel value="salesRevenue" label={t('columns.salesRevenue')} />
                            </th>
                        )}
                    </tr>
                </thead>

                {/* Sections */}
                {sections.map((section) => (
                    <tbody key={section.group}>
                        <tr className="border-b border-border">
                            <th
                                colSpan={showRevenue ? BASE_COLUMNS + 2 : BASE_COLUMNS}
                                scope="colgroup"
                                className="px-4 pt-5 pb-2 text-[11px] font-bold tracking-wide text-ink-muted uppercase"
                            >
                                <CampaignSectionLabel group={section.group} />
                            </th>
                        </tr>
                        {section.rows.map((row) => (
                            <tr
                                key={campaignRowKey(row)}
                                data-record-id={row.link?.id}
                                onClick={onRowAction}
                                className={`border-b border-border last:border-b-0 hover:bg-canvas/55 ${row.link ? 'cursor-pointer' : ''}`}
                            >
                                {/* Name */}
                                <td className="px-4 py-3">
                                    {row.link ? (
                                        <div className="flex items-center gap-2">
                                            <CampaignPlatformIcon source={row.utmSource} medium={row.utmMedium} />
                                            <a
                                                href={formatRecordHash(CAMPAIGNS_HASH_ROOT, row.link.id)}
                                                data-record-id={row.link.id}
                                                onClick={onLinkAction}
                                                className="font-semibold text-ink underline-offset-2 hover:underline"
                                            >
                                                {row.link.name}
                                            </a>
                                            <CampaignLinkCopyButton link={row.link} />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <CampaignPlatformIcon source={row.utmSource} medium={row.utmMedium} />
                                            <span className="text-ink-faint">{t('notSaved')}</span>
                                        </div>
                                    )}
                                </td>
                                {/* Values */}
                                <td className="px-3 py-3 font-mono text-xs text-ink-muted">
                                    {row.utmSource ?? EMPTY_VALUE} / {row.utmMedium ?? EMPTY_VALUE}
                                </td>
                                <td className="px-3 py-3 font-mono text-xs text-ink-muted">{row.utmCampaign ?? EMPTY_VALUE}</td>
                                {/* Visits */}
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.visits)}</td>
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.visitors)}</td>
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.createClicks)}</td>
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.plansClicks)}</td>
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.planPicks)}</td>
                                {/* Sign-ups */}
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.signedUp)}</td>
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.createdEvent)}</td>
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.paidHost)}</td>
                                {/* Revenue */}
                                {row.revenueMinorByCurrency && (
                                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                                        {format.moneyByCurrency(row.revenueMinorByCurrency)}
                                    </td>
                                )}
                                {/* Sales */}
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.sales)}</td>
                                {row.salesRevenueMinorByCurrency && (
                                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                                        {format.moneyByCurrency(row.salesRevenueMinorByCurrency)}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                ))}
            </table>
        </div>
    );
}
