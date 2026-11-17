import type {
    EventAddonDto,
    EventModuleResponseDto,
    EventStatus,
    PaidServiceResponseDto,
    PlanTierResponseDto,
    PlatformModuleResponseDto,
} from '@/lib/api/types';
import { publicAssignableModuleUnlocks } from '@/lib/planModules';
import { SAVE_MY_DATE_MODULE_KEY } from '@/lib/saveMyDateRelease';

// How the event buys feature add-ons (KAN-82): a live event pays for them on their own,
// a draft adds them to its activation payment. Any other state can't change them.
export type FeatureAddonMode = 'checkout' | 'draft' | null;

export function featureAddonMode(eventStatus: EventStatus | null | undefined): FeatureAddonMode {
    if (eventStatus === 'ACTIVE') return 'checkout';
    if (eventStatus === 'DRAFT') return 'draft';
    return null;
}

export type FeatureAddonOffer = {
    service: PaidServiceResponseDto;
    // A draft's opt-in, removable until it's paid. A live event's owned add-ons aren't offered.
    added: boolean;
};

/**
 * The feature add-ons the Add-ons page offers: public, assignable module unlocks sold on the
 * event's plan for a module the plan lacks. A module the event already has (bought, or granted
 * by an admin) isn't offered again; on a draft, its own opt-ins stay listed so they can be removed.
 */
export function featureAddonOffers({
    paidServices,
    platformModules,
    plan,
    eventModules,
    ownedAddons,
    mode,
}: {
    paidServices: PaidServiceResponseDto[];
    platformModules: PlatformModuleResponseDto[];
    plan: PlanTierResponseDto | null | undefined;
    eventModules: EventModuleResponseDto[];
    ownedAddons: EventAddonDto[];
    mode: FeatureAddonMode;
}): FeatureAddonOffer[] {
    if (!mode) return [];

    const ownedCodes = new Set(ownedAddons.map((addon) => addon.code));
    const enabledModules = new Set(eventModules.filter((module_) => module_.isEnabled).map((module_) => module_.moduleKey as string));

    return publicAssignableModuleUnlocks(paidServices, platformModules, plan).flatMap((service): FeatureAddonOffer[] => {
        const owned = ownedCodes.has(service.code);
        if (owned) return mode === 'draft' ? [{ service, added: true }] : [];
        if (service.grantsModuleKey && enabledModules.has(service.grantsModuleKey)) return [];
        return [{ service, added: false }];
    });
}

// The catalogue total of the picked add-ons: no promotion or code applies to them.
export function featureAddonsTotalMinor(services: PaidServiceResponseDto[]): number {
    return services.reduce((sum, service) => sum + service.priceAmountMinor, 0);
}

// The ticked codes, kept in catalogue order and limited to what's still offered.
export function pickedFeatureAddons(offers: FeatureAddonOffer[], codes: ReadonlySet<string>): PaidServiceResponseDto[] {
    return offers.filter((offer) => !offer.added && codes.has(offer.service.code)).map((offer) => offer.service);
}

// The Save my date add-on sold on this plan, if any (KAN-82).
export function saveMyDateAddon(
    paidServices: PaidServiceResponseDto[],
    platformModules: PlatformModuleResponseDto[],
    plan: PlanTierResponseDto | null | undefined,
): PaidServiceResponseDto | null {
    return (
        publicAssignableModuleUnlocks(paidServices, platformModules, plan).find((service) => service.grantsModuleKey === SAVE_MY_DATE_MODULE_KEY) ??
        null
    );
}

export type AddonsStorageArea = 'purchase' | 'empty' | 'inactive' | null;

/**
 * What the Add-ons page shows for storage packs. A live event with no packs on its plan says so
 * only when it has no features for sale either; while the features are still loading, or could
 * not be read, it shows nothing rather than a line that may be wrong.
 */
export function addonsStorageArea({
    eventStatus,
    storagePackCount,
    featuresOffered,
    featuresSettled,
}: {
    eventStatus: EventStatus | null;
    storagePackCount: number;
    featuresOffered: boolean;
    featuresSettled: boolean;
}): AddonsStorageArea {
    if (eventStatus !== 'ACTIVE') return 'inactive';
    if (storagePackCount > 0) return 'purchase';
    if (!featuresSettled || featuresOffered) return null;
    return 'empty';
}
