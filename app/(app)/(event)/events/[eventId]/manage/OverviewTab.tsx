import { useTranslations } from 'next-intl';

import { GiftAccountSetup } from '@/components/manage/GiftAccountSetup';
import { OverviewDraftPanel } from '@/components/manage/OverviewDraftPanel';
import { TargetedSection } from '@/components/manage/TargetedSection';
import { UsagePanel } from '@/components/plan/UsagePanel';
import { MetricStrip } from '@/components/ui/MetricStrip';
import { useEventOverviewPlan } from '@/hooks/useEventOverviewPlan';
import type {
    EventModuleResponseDto,
    EventStatus,
    EventUsageResponseDto,
    PaidServiceResponseDto,
    PlanTierResponseDto,
    PlatformModuleResponseDto,
} from '@/lib/api/types';
import { formatBytes } from '@/lib/format';
import { GIFT_ACCOUNT_SECTION_ID } from '@/lib/manageSectionTargets';
import { routes } from '@/lib/routes';

export default function OverviewTab({
    memberCount,
    daysToGo,
    invitationCount,
    seatsClaimed,
    eventUsage,
    planTiers,
    paidServices,
    modules,
    eventModules,
    eventId,
    eventStatus,
    startAt,
}: {
    memberCount: number;
    daysToGo: number;
    invitationCount: number;
    seatsClaimed: number;
    eventUsage: EventUsageResponseDto | null;
    planTiers: PlanTierResponseDto[];
    paidServices: PaidServiceResponseDto[];
    modules: PlatformModuleResponseDto[];
    eventModules: EventModuleResponseDto[];
    eventId: string;
    eventStatus: EventStatus;
    startAt: string | null;
}) {
    const t = useTranslations('ManagePage');
    const { currentPlan, nextPlan, selectedAddons, activationTotal, wishlistAvailable, includedModuleKeys } = useEventOverviewPlan({
        eventId,
        eventStatus,
        eventUsage,
        planTiers,
        paidServices,
        modules,
        eventModules,
    });

    if (eventStatus === 'DRAFT') {
        return (
            <OverviewDraftPanel
                eventId={eventId}
                canPay={Boolean(startAt)}
                currency={currentPlan?.priceCurrency ?? 'EUR'}
                selectedAddons={selectedAddons}
                activationTotal={currentPlan?.priceCurrency ? activationTotal : null}
                wishlistAvailable={wishlistAvailable}
            />
        );
    }

    // The member count lives in this strip only: the usage panel below shows the
    // plan's headroom, so it reports storage and lets this cell carry members.
    const shownMemberCount = eventUsage?.memberCount ?? memberCount;
    const memberValue = eventUsage?.memberLimit ? `${shownMemberCount} / ${eventUsage.memberLimit}` : shownMemberCount;

    return (
        <div className="flex flex-col gap-5">
            {/* Gift account */}
            {wishlistAvailable && (
                <TargetedSection id={GIFT_ACCOUNT_SECTION_ID}>
                    <GiftAccountSetup eventId={eventId} />
                </TargetedSection>
            )}

            {/* Headline numbers */}
            <MetricStrip
                items={[
                    { key: 'members', label: t('stats.totalGuests.label'), value: memberValue },
                    { key: 'days', label: t('stats.daysToGo.label'), value: daysToGo },
                    { key: 'invitations', label: t('stats.invitations.label'), value: invitationCount },
                    { key: 'seats', label: t('stats.seats.label'), value: seatsClaimed },
                ]}
            />

            {/* Plan usage */}
            {eventUsage && (
                <UsagePanel
                    className="rounded-none border-0 border-t border-border bg-transparent p-0 pt-4 shadow-none"
                    title={t('usage.eventTitle')}
                    planName={currentPlan?.name ?? eventUsage.planTier}
                    nextPlanName={nextPlan?.name}
                    upgradeHref={routes.events.manage(eventId, { tab: 'billing' })}
                    includedModuleKeys={includedModuleKeys}
                    items={[
                        {
                            key: 'storage',
                            used: eventUsage.storageBytes,
                            limit: eventUsage.storageLimitBytes,
                            percent: eventUsage.storagePercent,
                            valueLabel:
                                eventUsage.storageLimitBytes === null
                                    ? formatBytes(eventUsage.storageBytes)
                                    : `${formatBytes(eventUsage.storageBytes)} / ${formatBytes(eventUsage.storageLimitBytes)}`,
                        },
                    ]}
                />
            )}
        </div>
    );
}
