'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CampaignCountCells } from '@/components/admin/campaigns/overview/CampaignCountCells';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { useExpandedKeys } from '@/hooks/useExpandedKeys';
import type { CampaignSourceGroup } from '@/lib/adminCampaignOverview';
import { EMPTY_VALUE } from '@/lib/adminFunnel';
import type { CampaignRowDto } from '@/lib/api/types';
import { campaignRowKey } from '@/lib/campaignLinks';
import { cn } from '@/lib/utils';

function CampaignRow({ row, nested }: { row: CampaignRowDto; nested: boolean }) {
    const t = useTranslations('AdminPage.campaigns');

    return (
        <tr className={cn('border-b border-border last:border-b-0', nested && 'bg-canvas/55')}>
            {/* Campaign */}
            <td className={cn('py-3 pr-3', nested ? 'pl-11' : 'pl-4')}>
                <span className="block font-mono text-xs text-ink">
                    {row.utmMedium ?? EMPTY_VALUE} / {row.utmCampaign ?? EMPTY_VALUE}
                </span>
                <span className="block text-xs text-ink-faint">{row.link?.name ?? t('notSaved')}</span>
            </td>
            <CampaignCountCells counts={row} />
        </tr>
    );
}

// Every source with its numbers, each one opening into its medium / campaign rows. With one source
// picked, its rows are listed directly.
export function CampaignSourceTable({ groups, picked }: { groups: CampaignSourceGroup[]; picked: boolean }) {
    const t = useTranslations('AdminPage.campaignOverview.bySource');
    const c = useTranslations('AdminPage.campaigns.columns');
    const { expanded, handleToggle } = useExpandedKeys();
    const showRevenue = groups.every((group) => group.totals.revenueMinorByCurrency !== null);

    return (
        <FunnelGroup title={picked ? t('titlePicked') : t('title')} window="visit">
            <div className="-mx-4 overflow-x-auto sm:-mx-5">
                <table aria-label={picked ? t('titlePicked') : t('title')} className="w-full min-w-[960px] border-collapse text-left text-sm">
                    {/* Columns */}
                    <thead>
                        <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                            <th className="px-4 py-3 font-bold">{picked ? t('campaign') : t('source')}</th>
                            <th className="px-3 py-3 text-right font-bold">{c('visits')}</th>
                            <th className="px-3 py-3 text-right font-bold">{c('visitors')}</th>
                            <th className="px-3 py-3 text-right font-bold">{c('createClicks')}</th>
                            <th className="px-3 py-3 text-right font-bold">{c('plansClicks')}</th>
                            <th className="px-3 py-3 text-right font-bold">{c('planPicks')}</th>
                            <th className="px-3 py-3 text-right font-bold">{c('signedUp')}</th>
                            <th className="px-3 py-3 text-right font-bold">{c('paidHost')}</th>
                            {showRevenue && <th className="px-4 py-3 text-right font-bold">{c('revenue')}</th>}
                        </tr>
                    </thead>

                    {/* Rows */}
                    <tbody>
                        {picked
                            ? groups.flatMap((group) => group.rows).map((row) => <CampaignRow key={campaignRowKey(row)} row={row} nested={false} />)
                            : groups.map((group) => {
                                  const open = expanded.has(group.source);
                                  return [
                                      <tr key={group.source} className="border-b border-border last:border-b-0 hover:bg-canvas/55">
                                          {/* Source */}
                                          <td className="px-4 py-3">
                                              <button
                                                  type="button"
                                                  data-key={group.source}
                                                  onClick={handleToggle}
                                                  aria-expanded={open}
                                                  className="inline-flex items-center gap-2 font-mono text-sm font-bold text-ink"
                                              >
                                                  <ChevronRight
                                                      aria-hidden="true"
                                                      className={cn('h-4 w-4 shrink-0 text-ink-faint transition-transform', open && 'rotate-90')}
                                                  />
                                                  {group.source}
                                                  <span className="font-sans text-xs font-normal text-ink-faint">
                                                      {t('campaigns', { count: group.rows.length })}
                                                  </span>
                                              </button>
                                          </td>
                                          <CampaignCountCells counts={group.totals} />
                                      </tr>,
                                      ...(open ? group.rows.map((row) => <CampaignRow key={campaignRowKey(row)} row={row} nested />) : []),
                                  ];
                              })}
                    </tbody>
                </table>
            </div>
        </FunnelGroup>
    );
}
