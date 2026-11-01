'use client';

import { Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { useConfigValueLabels } from '@/hooks/useConfigValueLabels';
import { formatMoney } from '@/lib/billing';
import { configSummary } from '@/lib/planModuleConfig';
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
    const labels = useConfigValueLabels();

    if (cell.kind === 'unsupported') return <td className="px-2.5 py-2" />;
    if (failed) return <td className="px-2.5 py-2 text-[11px] text-status-danger">{t('columnError')}</td>;

    const settings = configSummary(cell.moduleKey, cell.config, labels);
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
                {/* Settings */}
                {cell.kind === 'included' && settings.length > 0 && (
                    <span className="flex flex-col gap-0.5">
                        {settings.map((setting) => (
                            <span key={setting.key} className="text-[10.5px] leading-4 text-ink-muted">
                                {setting.label} <span className="font-mono font-semibold text-ink">{setting.value}</span>
                            </span>
                        ))}
                    </span>
                )}
            </button>
        </td>
    );
}
