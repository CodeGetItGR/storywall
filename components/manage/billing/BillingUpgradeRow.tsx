import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { PlanUpgradeModules } from '@/components/manage/billing/PlanUpgradeModules';
import type { BillingUpgradeRow as BillingUpgradeRowData } from '@/hooks/useBillingUpgradeRows';
import type { PlatformModuleResponseDto } from '@/lib/api/types';

export function BillingUpgradeRow({ row, modules }: { row: BillingUpgradeRowData; modules: PlatformModuleResponseDto[] }) {
    const t = useTranslations('EventPlanSettingsPage');
    const hasModuleChanges = row.addedModuleKeys.length > 0 || row.removedModuleKeys.length > 0;

    return (
        <li className="py-4 first:pt-0 last:pb-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                {/* Plan */}
                <div className="min-w-0">
                    <p className="text-base font-bold text-ink">{row.name}</p>
                    {row.chips.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                            {row.chips.map((chip) => (
                                <li key={chip} className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-ink">
                                    {chip}
                                </li>
                            ))}
                        </ul>
                    )}
                    {row.listPriceLabel && (
                        <p className="mt-2 text-xs text-ink-muted">
                            <span className="line-through">{row.listPriceLabel}</span>
                            {row.discountLabel && <span className="ml-1.5">{row.discountLabel}</span>}
                        </p>
                    )}
                </div>

                {/* Action */}
                <Link
                    href={row.href}
                    aria-label={row.buttonAriaLabel}
                    className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white tabular-nums transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
                >
                    {row.buttonLabel}
                </Link>
            </div>

            {/* What changes */}
            {hasModuleChanges && (
                <details className="group mt-2">
                    <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink [&::-webkit-details-marker]:hidden">
                        {t('upgrade.whatChanges')}
                        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <PlanUpgradeModules addedModuleKeys={row.addedModuleKeys} removedModuleKeys={row.removedModuleKeys} modules={modules} />
                </details>
            )}
        </li>
    );
}
