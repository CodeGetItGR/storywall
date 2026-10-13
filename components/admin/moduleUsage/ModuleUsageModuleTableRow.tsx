'use client';

import { useTranslations } from 'next-intl';

import type { ModuleUsageModuleRow } from '@/lib/adminModuleUsage';

const NUMBER_CELL = 'px-3 py-3 text-right font-mono text-[13px] whitespace-nowrap text-ink';

export function ModuleUsageModuleTableRow({ row }: { row: ModuleUsageModuleRow }) {
    const t = useTranslations('AdminPage.moduleUsage');

    return (
        <tr className="border-t border-border bg-canvas/55 first:border-t-0">
            {/* Module */}
            <th scope="row" className="px-5 py-3 text-left font-bold text-ink">
                {t(`modules.${row.moduleKey}`)}
            </th>

            {row.suppressed ? (
                // Too few events: no numbers at all, so a filter can't point at one event.
                <td colSpan={4} className="px-5 py-3 text-right text-[13px] text-ink-faint">
                    {t('tooFew')}
                </td>
            ) : (
                <>
                    {/* Events with the module */}
                    <td className={NUMBER_CELL}>{row.events}</td>

                    {/* Share that used it */}
                    <td className={NUMBER_CELL}>
                        {row.used}
                        <span className="ml-1.5 text-[11px] text-ink-faint">({row.usedCount})</span>
                    </td>

                    <td className="px-3 py-3" />
                    <td className="px-5 py-3" />
                </>
            )}
        </tr>
    );
}
