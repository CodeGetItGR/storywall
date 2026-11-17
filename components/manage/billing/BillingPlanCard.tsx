import { useTranslations } from 'next-intl';

import { BillingUsageMeter } from '@/components/manage/billing/BillingUsageMeter';
import { useBillingDiscountLine, useBillingPlanCard } from '@/hooks/useBillingPlanCard';
import type { BillingData } from '@/hooks/useEventBillingPanel';
import type { EventScheduleDto, EventUsageResponseDto } from '@/lib/api/types';

/**
 * What the host has right now: the plan, how long photos are kept, and storage and members
 * against their limits. The event's status is not repeated here: the page header shows it.
 */
export function BillingPlanCard({ data, schedule, usage }: { data: BillingData; schedule: EventScheduleDto; usage: EventUsageResponseDto | null }) {
    const t = useTranslations('EventPlanSettingsPage');
    const { keptUntil, meters } = useBillingPlanCard(schedule, usage);
    const discountLine = useBillingDiscountLine(data.discount);
    const hasFacts = keptUntil !== null || meters.length > 0;

    return (
        <section
            aria-labelledby="billing-plan-title"
            className="flex flex-col gap-4 rounded-[26px] bg-[linear-gradient(150deg,#fbe7f1_0%,#ffe9df_55%,#fff3dc_100%)] p-5 lg:p-6"
        >
            {/* Plan */}
            <div className="flex flex-col gap-0.5">
                <h2 id="billing-plan-title" className="text-[13px] font-semibold text-ink-muted">
                    {t('yourPlan.title')}
                </h2>
                <p className="text-[26px] leading-tight font-bold text-ink lg:text-[30px]">{data.planTierName}</p>
                {data.eventStatus === 'DRAFT' && <p className="mt-1 text-sm text-ink-muted">{t('summary.DRAFT')}</p>}

                {/* Discount */}
                {discountLine && <p className="mt-1 text-sm font-semibold text-emerald-700">{discountLine}</p>}
            </div>

            {/* Facts */}
            {hasFacts && (
                <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-3">
                    {/* Photos kept until */}
                    {keptUntil && (
                        <div className="col-span-2 flex flex-col gap-1.5 lg:col-span-1">
                            <span className="text-xs font-semibold text-ink-muted">{t('coverage.keptUntil')}</span>
                            <span className="text-base font-bold text-ink">{keptUntil}</span>
                        </div>
                    )}

                    {/* Storage and members */}
                    {meters.map((meter) => (
                        <BillingUsageMeter key={meter.key} meter={meter} unlimitedLabel={t('compare.unlimited')} />
                    ))}
                </div>
            )}
        </section>
    );
}
