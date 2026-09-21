import { useTranslations } from 'next-intl';

import Section from '@/components/manage/Section';
import { type BillingInsights, useBillingDate } from '@/hooks/useEventBillingPanel';
import type { EventScheduleDto, PlanTierResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

/**
 * The four dates a paid event lives by: activated, gallery opens, kept until,
 * plan term. All pinned at activation, so they are read straight off the
 * response and never recomputed here. Hidden while DRAFT — nothing is pinned yet.
 */
export function BillingCoveragePanel({
    schedule,
    insights,
    currentPlan,
}: {
    schedule: EventScheduleDto;
    insights: BillingInsights;
    currentPlan: PlanTierResponseDto | null;
}) {
    const t = useTranslations('EventPlanSettingsPage.coverage');
    const tCompare = useTranslations('EventPlanSettingsPage.compare');
    const formatBillingDate = useBillingDate();
    if (!schedule.galleryOpensAt || !schedule.coverageEndsAt) return null;

    // Admin-provisioned events have no activation order, so the paid date is optional.
    const activatedOn = insights.activationOrder?.paidAt ?? null;
    const facts = [
        ...(activatedOn ? [{ key: 'activatedOn', label: t('activatedOn'), value: formatBillingDate(activatedOn) }] : []),
        { key: 'galleryOpens', label: t('galleryOpens'), value: formatBillingDate(schedule.galleryOpensAt) },
        { key: 'keptUntil', label: t('keptUntil'), value: formatBillingDate(schedule.coverageEndsAt) },
        {
            key: 'planTerm',
            label: t('planTerm'),
            value: currentPlan?.autoDeleteMonths ? tCompare('monthCount', { count: currentPlan.autoDeleteMonths }) : t('planTermUnlimited'),
        },
    ];

    return (
        <Section title={t('title')} divider>
            <dl className={cn('grid grid-cols-2 gap-x-4 gap-y-3', facts.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3')}>
                {facts.map((fact) => (
                    <div key={fact.key} className="min-w-0">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{fact.label}</dt>
                        <dd className="mt-0.5 text-sm font-semibold text-ink">{fact.value}</dd>
                    </div>
                ))}
            </dl>
            <p className="mt-3 text-xs text-ink-muted">{t('fixedNote')}</p>
        </Section>
    );
}
