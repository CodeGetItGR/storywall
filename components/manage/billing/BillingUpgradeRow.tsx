import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PlanRemovedModules } from '@/components/manage/billing/PlanRemovedModules';
import { DurationPicker } from '@/components/plan/DurationPicker';
import { AppLink } from '@/components/ui/AppLink';
import type { BillingUpgradeRow as BillingUpgradeRowData } from '@/hooks/useBillingUpgradeRows';
import type { EventTypeConvention } from '@/lib/api/types';
import { INCIDENT_MODE } from '@/lib/incident';
import { cn } from '@/lib/utils';

const ACTION_CLASS_NAME =
    'inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

// One upgrade target as a card: name and price, length, what changes, Upgrade.
export function BillingUpgradeRow({
    row,
    eventTypeKey,
    onDurationChangeAction,
}: {
    row: BillingUpgradeRowData;
    eventTypeKey: EventTypeConvention | null;
    onDurationChangeAction: (planCode: string, optionId: string) => void;
}) {
    const t = useTranslations('EventPlanSettingsPage');
    const changesId = `upgrade-changes-${row.code}`;

    function handleDurationChange(optionId: string) {
        onDurationChangeAction(row.code, optionId);
    }

    return (
        <li className="flex flex-col gap-3 rounded-[22px] border-[1.5px] border-[#f2c2b2] p-[18px]">
            {/* Plan and price */}
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <h3 className="flex-1 text-[19px] leading-tight font-bold text-ink">{row.name}</h3>
                <p className="text-right">
                    {row.listPriceLabel && (
                        <span className="mr-1.5 text-xs text-ink-muted">
                            <span className="line-through">{row.listPriceLabel}</span>
                            {row.discountLabel && <span className="ml-1">{row.discountLabel}</span>}
                        </span>
                    )}
                    <span className="text-[17px] font-bold text-ink tabular-nums">{row.priceLabel}</span>
                </p>
            </div>

            {/* Duration */}
            <DurationPicker options={row.durations} value={row.durationId} onChangeAction={handleDurationChange} variant="segmented" />
            {row.monthsAdded > 0 && <p className="text-[13px] font-semibold text-emerald-700">{t('upgrade.addsMonths', { count: row.monthsAdded })}</p>}

            {/* What changes */}
            {row.chips.length > 0 && (
                <div>
                    <p id={changesId} className="text-xs font-bold text-ink-muted">
                        {t('upgrade.whatChanges')}
                    </p>
                    <ul aria-labelledby={changesId} className="mt-1.5 flex flex-col gap-1.5">
                        {row.chips.map((chip) => (
                            <li key={chip} className="flex items-center gap-2 text-sm text-ink">
                                <Check className="h-4 w-4 shrink-0 text-emerald-700" strokeWidth={2.6} aria-hidden="true" />
                                {chip}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* No longer included */}
            <PlanRemovedModules moduleKeys={row.removedModuleKeys} eventTypeKey={eventTypeKey} />

            {/* Action */}
            {INCIDENT_MODE ? (
                <span role="link" aria-disabled="true" className={cn(ACTION_CLASS_NAME, 'cursor-not-allowed opacity-40')}>
                    {row.buttonLabel}
                </span>
            ) : (
                <AppLink href={row.href} aria-label={row.buttonAriaLabel} className={ACTION_CLASS_NAME}>
                    {row.buttonLabel}
                </AppLink>
            )}
        </li>
    );
}
