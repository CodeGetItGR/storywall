'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { AdminTipBubble } from '@/components/admin/AdminTipBubble';
import { CampaignLinkLabel } from '@/components/admin/campaigns/CampaignLinkLabel';
import { CampaignPlatformIcon } from '@/components/admin/campaigns/CampaignPlatformIcon';
import { CampaignVerdict } from '@/components/admin/campaigns/CampaignVerdict';
import { PlatformMetricBar } from '@/components/admin/PlatformMetricBar';
import { useAdminInfoTip } from '@/hooks/useAdminInfoTip';
import { useCampaignFormat } from '@/hooks/useCampaignFormat';
import { useDisclosure } from '@/hooks/useDisclosure';
import { EMPTY_VALUE } from '@/lib/adminFunnel';
import type { CampaignPlatformRowData } from '@/lib/campaignCompare';
import { CAMPAIGN_PLATFORM_PRESETS } from '@/lib/campaignLinks';
import { cn } from '@/lib/utils';

const NUMBER = 'font-mono text-sm text-ink tabular-nums';
const CELL = 'sm:px-3 sm:py-3';

// Names a number on a phone, where the table's column titles are hidden.
function CellLabel({ children }: { children: ReactNode }) {
    return <span className="block text-[11px] font-semibold text-ink-muted sm:hidden">{children}</span>;
}

export function CampaignPlatformRow({ row, rateTitle }: { row: CampaignPlatformRowData; rateTitle: string }) {
    const t = useTranslations('AdminPage.campaigns');
    const format = useCampaignFormat();
    const { open, toggle } = useDisclosure(false);
    // The toggle shows the platform's name on hover, focus or tap, and a tap still opens the links.
    const { open: tipOpen, triggerRef, bubbleRef, handlers } = useAdminInfoTip();
    const name = t(`presets.${CAMPAIGN_PLATFORM_PRESETS[row.platform]}`);

    return (
        <tbody className="block border-t border-border first-of-type:border-t-0 sm:table-row-group">
            {/* Platform */}
            <tr className="grid grid-cols-6 items-center gap-x-3 gap-y-2 py-3 sm:table-row sm:py-0">
                <th scope="row" className="col-span-1 text-left font-normal sm:py-3 sm:pr-3">
                    {row.expandable ? (
                        <>
                            <button
                                ref={triggerRef}
                                type="button"
                                onClick={toggle}
                                onPointerEnter={handlers.handlePointerEnter}
                                onPointerLeave={handlers.handlePointerLeave}
                                onPointerUp={handlers.handlePointerUp}
                                onFocus={handlers.handleFocus}
                                onBlur={handlers.handleBlur}
                                aria-expanded={open}
                                aria-label={name}
                                className="inline-flex min-h-9 items-center gap-1 rounded-md px-1 hover:bg-canvas"
                            >
                                <CampaignPlatformIcon platform={row.platform} className="h-5 w-5" decorative />
                                <ChevronDown
                                    aria-hidden="true"
                                    className={cn('h-3.5 w-3.5 text-ink-faint transition-transform', open && 'rotate-180')}
                                />
                            </button>
                            {tipOpen && <AdminTipBubble bubbleRef={bubbleRef} text={name} />}
                        </>
                    ) : (
                        <span className="inline-flex min-h-9 items-center px-1">
                            <CampaignPlatformIcon platform={row.platform} className="h-5 w-5" />
                        </span>
                    )}
                </th>

                {row.counts.visitors === 0 ? (
                    // No visits: nothing to compare yet.
                    <td colSpan={4} className={cn('col-span-5 text-sm text-ink-faint', CELL)}>
                        {t('platforms.noVisits')}
                    </td>
                ) : (
                    <>
                        {/* Visitors */}
                        <td className={cn('col-span-5', CELL)}>
                            <CellLabel>{t('columns.visitors')}</CellLabel>
                            <span className="flex items-center gap-3">
                                <PlatformMetricBar ratio={row.share} className="min-w-16 flex-1" />
                                <span className={cn(NUMBER, 'font-semibold')}>{format.count(row.counts.visitors)}</span>
                            </span>
                        </td>

                        {/* Sign-ups */}
                        <td className={cn('col-span-2 sm:text-right', CELL)}>
                            <CellLabel>{t('columns.signedUp')}</CellLabel>
                            <span className={NUMBER}>{format.count(row.counts.signedUp)}</span>
                        </td>

                        {/* Sales */}
                        <td className={cn('col-span-2 sm:text-right', CELL)}>
                            <CellLabel>{t('columns.sales')}</CellLabel>
                            <span className={NUMBER}>{format.count(row.counts.sales)}</span>
                        </td>

                        {/* Rate and verdict */}
                        <td className="col-span-2 sm:py-3 sm:pl-3">
                            <CellLabel>{rateTitle}</CellLabel>
                            <span className="inline-flex flex-wrap items-center gap-2">
                                <span className={NUMBER}>{row.rate === null ? EMPTY_VALUE : format.rate(row.rate)}</span>
                                <CampaignVerdict verdict={row.verdict} />
                            </span>
                        </td>
                    </>
                )}
            </tr>

            {/* Links */}
            {open &&
                row.lines.map((line) => (
                    <tr
                        key={line.link.id}
                        data-testid="platform-link"
                        className="grid grid-cols-6 items-center gap-x-3 gap-y-1 pb-3 pl-8 sm:table-row sm:p-0"
                    >
                        <td className="col-span-6 min-w-0 sm:py-2 sm:pr-3 sm:pl-9">
                            <CampaignLinkLabel label={line.label} showPlatform={false} />
                        </td>
                        <td className="col-span-2 sm:px-3 sm:py-2 sm:text-right">
                            <CellLabel>{t('columns.visitors')}</CellLabel>
                            <span className={NUMBER}>{format.count(line.counts.visitors)}</span>
                        </td>
                        <td className="col-span-2 sm:px-3 sm:py-2 sm:text-right">
                            <CellLabel>{t('columns.signedUp')}</CellLabel>
                            <span className={NUMBER}>{format.count(line.counts.signedUp)}</span>
                        </td>
                        <td className="col-span-2 sm:px-3 sm:py-2 sm:text-right">
                            <CellLabel>{t('columns.sales')}</CellLabel>
                            <span className={NUMBER}>{format.count(line.counts.sales)}</span>
                        </td>
                        <td className="hidden sm:table-cell" />
                    </tr>
                ))}
        </tbody>
    );
}
