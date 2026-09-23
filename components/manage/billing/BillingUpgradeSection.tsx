import { useTranslations } from 'next-intl';

import { BillingUpgradeRow } from '@/components/manage/billing/BillingUpgradeRow';
import Section from '@/components/manage/Section';
import { useBillingUpgradeRows } from '@/hooks/useBillingUpgradeRows';
import type { BillingUpgradeTarget } from '@/hooks/useEventBillingPanel';
import type { PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

export function BillingUpgradeSection({
    eventId,
    targets,
    currentPlan,
    extraStorageBytes,
    modules,
}: {
    eventId: string;
    targets: BillingUpgradeTarget[];
    currentPlan: PlanTierResponseDto | null;
    extraStorageBytes: number;
    modules: PlatformModuleResponseDto[];
}) {
    const t = useTranslations('EventPlanSettingsPage');
    const rows = useBillingUpgradeRows({ eventId, targets, currentPlan, extraStorageBytes });

    if (rows.length === 0) return null;

    return (
        <Section title={t('compare.upgradeOptions')} divider>
            {/* Plans */}
            <ul className="divide-y divide-ink/10">
                {rows.map((row) => (
                    <BillingUpgradeRow key={row.code} row={row} modules={modules} />
                ))}
            </ul>
        </Section>
    );
}
