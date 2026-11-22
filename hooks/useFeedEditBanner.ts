'use client';

import { useStoragePurchasePaused } from '@/hooks/useBillingWithdrawals';
import { usePurchaseBlock } from '@/hooks/usePurchaseBlock';
import type { EventDetailResponseDto, EventStatus, PaidServiceResponseDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { isEventWritable, isModuleAvailable } from '@/lib/eventLifecycle';
import { featureAddonMode, saveMyDateAddon } from '@/lib/featureAddons';
import { feedEditBannerState } from '@/lib/feedEditBanner';
import { feedEditHref } from '@/lib/feedEditLink';
import { INCIDENT_MODE } from '@/lib/incident';
import { routes } from '@/lib/routes';
import { useFeedEditorEnabled } from '@/providers/FeedEditorFlagProvider';

type FeedEditBannerInput = {
    event: Pick<EventDetailResponseDto, 'id' | 'modules'>;
    eventStatus: EventStatus;
    paidServices: PaidServiceResponseDto[];
    modules: PlatformModuleResponseDto[];
    currentPlan: PlanTierResponseDto | null | undefined;
};

// Which Overview banner shows, and where its button goes. usePurchaseBlock is null only for the main host
// outside the demo, the same viewers usePlanUpgradeHref answers for. The event type plays no part.
export function useFeedEditBanner({ event, eventStatus, paidServices, modules, currentPlan }: FeedEditBannerInput) {
    const flag = useFeedEditorEnabled();
    const purchaseBlock = usePurchaseBlock();
    const saveMyDate = isModuleAvailable(event.modules, 'save_my_date');
    const addon = saveMyDateAddon(paidServices, modules, currentPlan);
    const checkout = featureAddonMode(eventStatus) === 'checkout';
    const canBuy = purchaseBlock === null && !INCIDENT_MODE;
    const asksToBuy = flag && !saveMyDate && addon !== null && checkout && canBuy;
    const paused = useStoragePurchasePaused(event.id, asksToBuy);

    const state = feedEditBannerState({
        flag,
        saveMyDate,
        writable: isEventWritable(eventStatus),
        offered: addon !== null,
        checkout,
        canBuy,
        paused,
    });
    const href =
        state === 'locked' && addon
            ? routes.events.settingsAddons(event.id, { add: addon.code })
            : state === 'included'
              ? feedEditHref(event.id)
              : null;
    return { state, href };
}
