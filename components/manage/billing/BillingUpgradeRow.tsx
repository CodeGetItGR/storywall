import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { PlanUpgradeModules } from '@/components/manage/billing/PlanUpgradeModules';
import { DurationPicker } from '@/components/plan/DurationPicker';
import type { BillingUpgradeRow as BillingUpgradeRowData } from '@/hooks/useBillingUpgradeRows';
import type { PlatformModuleResponseDto } from '@/lib/api/types';

// The landing plan card's look (tracked name, gradient serif price, underlined
// durations, ✓ list), laid out inline as a row.
export function BillingUpgradeRow({
    row,
    modules,
    onDurationChangeAction,
}: {
    row: BillingUpgradeRowData;
    modules: PlatformModuleResponseDto[];
    onDurationChangeAction: (planCode: string, optionId: string) => void;
}) {
    const t = useTranslations('EventPlanSettingsPage');
    const hasModuleChanges = row.addedModuleKeys.length > 0 || row.removedModuleKeys.length > 0;

    function handleDurationChange(optionId: string) {
        onDurationChangeAction(row.code, optionId);
    }

    return (
        <li className="py-6 first:pt-0 last:pb-0">
            {/* Plan and price */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <h3 className="text-xl leading-tight font-black tracking-[.09em] text-ink">{row.name}</h3>
                <p className="text-right">
                    {row.listPriceLabel && (
                        <span className="mr-2 text-sm text-ink-muted">
                            <span className="line-through">{row.listPriceLabel}</span>
                            {row.discountLabel && <span className="ml-1.5">{row.discountLabel}</span>}
                        </span>
                    )}
                    <span className="bg-[linear-gradient(110deg,#d889a0,#e98778_28%,#f39a63_58%,#f5b967)] bg-clip-text pr-[.06em] font-[Baskerville,Georgia,serif] text-[40px] leading-[1.1] tracking-[-.06em] text-transparent tabular-nums">
                        {row.priceLabel}
                    </span>
                </p>
            </div>

            {/* Duration */}
            <DurationPicker
                options={row.durations}
                value={row.durationId}
                onChangeAction={handleDurationChange}
                variant="marketing"
                className="mt-2"
            />
            {row.monthsAdded > 0 && <p className="text-sm text-ink-muted">{t('upgrade.addsMonths', { count: row.monthsAdded })}</p>}

            {/* What you get */}
            {row.chips.length > 0 && (
                <ul className="mt-3 list-none p-0">
                    {row.chips.map((chip) => (
                        <li
                            key={chip}
                            className="relative border-b border-ink/10 py-2.5 pl-6 text-sm leading-snug text-ink before:absolute before:top-2.5 before:left-0 before:content-['✓']"
                        >
                            {chip}
                        </li>
                    ))}
                </ul>
            )}

            {/* What changes */}
            {hasModuleChanges && (
                <details className="group mt-1">
                    <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink [&::-webkit-details-marker]:hidden">
                        {t('upgrade.whatChanges')}
                        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <PlanUpgradeModules addedModuleKeys={row.addedModuleKeys} removedModuleKeys={row.removedModuleKeys} modules={modules} />
                </details>
            )}

            {/* Action */}
            <Link
                href={row.href}
                aria-label={row.buttonAriaLabel}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
            >
                {row.buttonLabel}
            </Link>
        </li>
    );
}
