'use client';

import { Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { formatMoney } from '@/lib/billing';
import { formatConfigValue } from '@/lib/planModuleConfig';
import type { PlanModuleCell } from '@/lib/planModuleGrid';
import { cn } from '@/lib/utils';

export function PlanModuleGridCell({
    cell,
    failed,
    onClickAction,
}: {
    cell: PlanModuleCell;
    failed: boolean;
    onClickAction: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
    const t = useTranslations('AdminPage.plans.grid');
    const locale = useLocale();

    if (cell.kind === 'unsupported') return <td className="px-2.5 py-2" />;
    if (failed) return <td className="px-2.5 py-2 text-[11px] text-status-danger">{t('columnError')}</td>;

    const tokens = Object.entries(cell.config).map(([key, value]) => `${key} ${formatConfigValue(value)}`);
    const unlockLabel =
        cell.kind === 'excluded' && cell.unlock
            ? cell.unlock.billingPeriod === 'ONE_TIME'
                ? t('unlockOnce', { price: formatMoney(locale, cell.unlock.priceAmountMinor, cell.unlock.priceCurrency) })
                : t('unlockMonthly', { price: formatMoney(locale, cell.unlock.priceAmountMinor, cell.unlock.priceCurrency) })
            : null;

    return (
        <td className="px-1 py-1 align-top">
            <button
                type="button"
                data-plan-id={cell.planId}
                data-module-key={cell.moduleKey}
                onClick={onClickAction}
                aria-label={cell.kind === 'included' ? t('included') : t('notIncluded')}
                className={cn(
                    'flex min-h-11 w-full flex-col items-start gap-1 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-canvas',
                    cell.kind === 'excluded' && 'text-ink-faint',
                )}
            >
                <span className="inline-flex items-center gap-1 text-[11px] font-bold">
                    {cell.kind === 'included' ? (
                        <Check className="h-3.5 w-3.5 text-status-good" aria-hidden="true" />
                    ) : (
                        <span aria-hidden="true">—</span>
                    )}
                    {cell.kind === 'included' ? t('included') : (unlockLabel ?? t('notIncluded'))}
                </span>
                {cell.kind === 'included' && tokens.length > 0 && (
                    <span className="flex flex-wrap gap-1">
                        {tokens.map((token) => (
                            <span key={token} className="rounded bg-canvas px-1 font-mono text-[10.5px] text-ink-muted">
                                {token}
                            </span>
                        ))}
                    </span>
                )}
            </button>
        </td>
    );
}
