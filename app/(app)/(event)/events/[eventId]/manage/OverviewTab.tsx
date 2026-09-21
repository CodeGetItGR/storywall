import { useTranslations } from 'next-intl';

import { HostContextSections } from '@/components/layout/right-context-panel/HostContextSections';
import { CoverageStatusStrip } from '@/components/manage/CoverageStatusStrip';
import { OverviewDraftPanel } from '@/components/manage/OverviewDraftPanel';
import { MetricStrip } from '@/components/ui/MetricStrip';
import { useEventOverviewPlan } from '@/hooks/useEventOverviewPlan';
import { useRightContextPanel } from '@/hooks/useRightContextPanel';
import type {
    EventModuleResponseDto,
    EventScheduleDto,
    EventStatus,
    EventTypeConvention,
    EventUsageResponseDto,
    PaidServiceResponseDto,
    PlanTierResponseDto,
    PlatformModuleResponseDto,
} from '@/lib/api/types';

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
    eventTitle,
    eventType,
    eventStatus,
    schedule,
    cancelledCheckout,
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
    eventTitle: string;
    eventType: EventTypeConvention;
    eventStatus: EventStatus;
    schedule: EventScheduleDto;
    cancelledCheckout: boolean;
}) {
    const t = useTranslations('ManagePage');
    const { currentPlan, selectedAddons, activationTotal, wishlistAvailable } = useEventOverviewPlan({
        eventId,
        eventStatus,
        eventUsage,
        planTiers,
        paidServices,
        modules,
        eventModules,
    });
    const hostContextPanel = useRightContextPanel({ includeManageLinks: false });

    if (eventStatus === 'DRAFT') {
        return (
            <OverviewDraftPanel
                eventId={eventId}
                eventTitle={eventTitle}
                eventType={eventType}
                startAt={schedule.startAt}
                projectedCoverage={schedule.projectedCoverage}
                currentPlan={currentPlan}
                currency={currentPlan?.priceCurrency ?? 'EUR'}
                selectedAddons={selectedAddons}
                activationTotal={currentPlan?.priceCurrency ? activationTotal : null}
                wishlistAvailable={wishlistAvailable}
                cancelledCheckout={cancelledCheckout}
            />
        );
    }

    // The member count lives in this strip only: the usage panel below shows the
    // plan's headroom, so it reports storage and lets this cell carry members.
    const shownMemberCount = eventUsage?.memberCount ?? memberCount;
    const memberValue = eventUsage?.memberLimit ? `${shownMemberCount} / ${eventUsage.memberLimit}` : shownMemberCount;

    return (
        <div className="flex flex-col gap-5">
            {/* Coverage status */}
            <CoverageStatusStrip eventId={eventId} schedule={schedule} />

            {/* Headline numbers */}
            <MetricStrip
                items={[
                    { key: 'members', label: t('stats.totalGuests.label'), value: memberValue },
                    { key: 'days', label: t('stats.daysToGo.label'), value: daysToGo },
                    { key: 'invitations', label: t('stats.invitations.label'), value: invitationCount },
                    { key: 'seats', label: t('stats.seats.label'), value: seatsClaimed },
                ]}
            />

            {/* Host context: same actions, usage and summaries the feed page's right panel shows */}
            <div className="border-t border-border pt-4">
                <HostContextSections panel={hostContextPanel} showMembersUsage={false} />
            </div>
        </div>
    );
}
