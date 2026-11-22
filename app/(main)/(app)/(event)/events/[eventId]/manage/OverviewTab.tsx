import { InviartOverviewSection } from '@/components/inviart/InviartOverviewSection';
import { ManageDraftOverviewSkeleton } from '@/components/manage/ManageSkeletons';
import { FeedEditBannerSection } from '@/components/manage/overview/FeedEditBannerSection';
import { OverviewJourney } from '@/components/manage/overview/OverviewJourney';
import { OverviewDraftPanel } from '@/components/manage/OverviewDraftPanel';
import { ThemePicker } from '@/components/manage/ThemePicker';
import { useEventOverviewPlan } from '@/hooks/useEventOverviewPlan';
import type {
    EventDetailResponseDto,
    EventModuleResponseDto,
    EventScheduleDto,
    EventStatus,
    EventTypeConvention,
    EventUsageResponseDto,
    PaidServiceResponseDto,
    PlanTierResponseDto,
    PlatformModuleResponseDto,
} from '@/lib/api/types';
import { eventCapabilities } from '@/lib/eventCapabilities';

export default function OverviewTab({
    event,
    memberCount,
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
    canPurchase,
}: {
    // The draft's theme picker and the live journey read the whole event; everything else reads the narrower props below.
    event: EventDetailResponseDto;
    memberCount: number;
    seatsClaimed: number | null;
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
    canPurchase: boolean;
}) {
    const {
        currentPlan,
        currentOption,
        savedOptionId,
        durationOptions,
        durationUnavailable,
        selectedAddons,
        activationTotal,
        isBillingLoading,
        wishlistAvailable,
    } = useEventOverviewPlan({
        eventId,
        eventStatus,
        eventUsage,
        planTiers,
        paidServices,
        modules,
        eventModules,
    });

    if (eventStatus === 'DRAFT') {
        // The draft's duration, and so its price, comes from the billing view.
        if (isBillingLoading) return <ManageDraftOverviewSkeleton />;

        return (
            <OverviewDraftPanel
                eventId={eventId}
                eventTitle={eventTitle}
                eventType={eventType}
                startAt={schedule.startAt}
                endAt={schedule.endAt}
                asksStartDate={eventCapabilities(event)?.showsDetailsSettings ?? true}
                projectedCoverage={schedule.projectedCoverage}
                currentPlan={currentPlan}
                currentOption={currentOption}
                savedOptionId={savedOptionId}
                durationOptions={durationOptions}
                durationUnavailable={durationUnavailable}
                canPurchase={canPurchase}
                currency={currentPlan?.priceCurrency ?? 'EUR'}
                selectedAddons={selectedAddons}
                activationTotal={currentPlan?.priceCurrency ? activationTotal : null}
                wishlistAvailable={wishlistAvailable}
                cancelledCheckout={cancelledCheckout}
                // A draft has no settings tab, so its theme is picked here. Hosts may edit a draft.
                themeSection={<ThemePicker event={event} canWrite />}
            />
        );
    }

    // Members are counted on the invitations stop, against the plan's limit.
    const counts = { memberCount: eventUsage?.memberCount ?? memberCount, memberLimit: eventUsage?.memberLimit ?? null, seatsClaimed };

    return (
        <div className="flex flex-col gap-8">
            {/* Journey */}
            <OverviewJourney event={event} eventUsage={eventUsage} planName={currentPlan?.name ?? null} counts={counts} />

            {/* Customize the feed */}
            <FeedEditBannerSection event={event} eventStatus={eventStatus} paidServices={paidServices} modules={modules} currentPlan={currentPlan} />

            {/* INVIART */}
            <InviartOverviewSection eventType={eventType} />
        </div>
    );
}
