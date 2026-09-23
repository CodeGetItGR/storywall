import { useTranslations } from 'next-intl';

import Section from '@/components/manage/Section';
import { useBillingPlanFacts } from '@/hooks/useBillingPlanFacts';
import type { BillingData } from '@/hooks/useEventBillingPanel';
import type { EventScheduleDto, EventUsageResponseDto } from '@/lib/api/types';

/**
 * What the host has right now: the plan, its coverage dates and its limits.
 * The event's status is not repeated here — the page header already shows it.
 */
export function BillingPlanSummary({
    data,
    schedule,
    usage,
}: {
    data: BillingData;
    schedule: EventScheduleDto;
    usage: EventUsageResponseDto | null;
}) {
    const t = useTranslations('EventPlanSettingsPage');
    const facts = useBillingPlanFacts(schedule, usage);

    return (
        <Section title={t('yourPlan.title')}>
            {/* Plan */}
            <p className="text-xl font-bold text-ink">{data.planTierName}</p>
            {data.eventStatus === 'DRAFT' && <p className="mt-1 text-sm text-ink-muted">{t('summary.DRAFT')}</p>}

            {/* Facts */}
            {facts.length > 0 && (
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
                    {facts.map((fact) => (
                        <div key={fact.key} className="min-w-0">
                            <dt className="text-xs text-ink-muted">{fact.label}</dt>
                            <dd className="mt-0.5 text-sm font-semibold text-ink">{fact.value}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </Section>
    );
}
