import { useTranslations } from 'next-intl';

import { IncidentPausedNote } from '@/components/incident/IncidentPausedNote';
import { BillingUpgradeRow } from '@/components/manage/billing/BillingUpgradeRow';
import { useBillingUpgradeRows } from '@/hooks/useBillingUpgradeRows';
import { useDurationPicks } from '@/hooks/useDurationPicks';
import type { BillingUpgradeTarget } from '@/hooks/useEventBillingPanel';
import type { PlanTierResponseDto } from '@/lib/api/types';

export function BillingUpgradeSection({
    eventId,
    targets,
    currentPlan,
    extraStorageBytes,
}: {
    eventId: string;
    targets: BillingUpgradeTarget[];
    currentPlan: PlanTierResponseDto | null;
    extraStorageBytes: number;
}) {
    const t = useTranslations('EventPlanSettingsPage');
    const { picks, pickDuration } = useDurationPicks();
    const rows = useBillingUpgradeRows({ eventId, targets, currentPlan, extraStorageBytes, picks });

    if (rows.length === 0) return null;

    return (
        <section aria-labelledby="billing-upgrade-title" className="flex flex-col gap-2.5">
            {/* Heading */}
            <h2 id="billing-upgrade-title" className="text-base font-bold text-ink">
                {t('compare.upgradeOptions')}
            </h2>

            {/* Incident note */}
            <IncidentPausedNote />

            {/* Plans */}
            <ul className="flex flex-col gap-3">
                {rows.map((row) => (
                    <BillingUpgradeRow
                        key={row.code}
                        row={row}
                        eventTypeKey={currentPlan?.eventTypeKey ?? null}
                        onDurationChangeAction={pickDuration}
                    />
                ))}
            </ul>
        </section>
    );
}
