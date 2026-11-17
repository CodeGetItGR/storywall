import type {
    EventBillingResponseDto,
    EventModuleResponseDto,
    PaidServiceResponseDto,
    PlanTierResponseDto,
    PlatformModuleResponseDto,
    WithdrawalResponseDto,
} from '@/lib/api/types';
import { type FeatureAddonMode, featureAddonMode, type FeatureAddonOffer, featureAddonOffers } from '@/lib/featureAddons';
import type { InvitationDocument } from '@/lib/invitation/document';
import { scopedPlans } from '@/lib/planTiers';
import { withdrawalPurchaseBlocks } from '@/lib/priceBreakdown';
import { SAVE_MY_DATE_MODULE_KEY } from '@/lib/saveMyDateRelease';

const RSVP_MODULE_KEY = 'rsvp';

// Publish's add-on step (KAN-82): Save my date, always included, and RSVP when the invitation asks for replies.
export type InvitationAddonStep = {
    mode: Exclude<FeatureAddonMode, null>;
    saveMyDate: FeatureAddonOffer;
    rsvp: FeatureAddonOffer | null;
};

// Whether the invitation shows its RSVP section.
export function showsRsvpSection(document: InvitationDocument): boolean {
    return document.sections.some((section) => section.type === RSVP_MODULE_KEY && section.visible);
}

export function eventPlan(planTiers: PlanTierResponseDto[], planTierCode: string | null | undefined): PlanTierResponseDto | null {
    return scopedPlans(planTiers, 'EVENT').find((plan) => plan.code === planTierCode) ?? null;
}

type AddonStepSources = {
    paidServices: PaidServiceResponseDto[];
    platformModules: PlatformModuleResponseDto[];
    planTiers: PlanTierResponseDto[];
    billing: Pick<EventBillingResponseDto, 'eventStatus' | 'planTierCode' | 'addons' | 'orders'>;
    eventModules: EventModuleResponseDto[];
};

/**
 * The step for this event, or null when its plan sells no Save my date add-on (or the event already
 * has the invitation). RSVP joins only when the invitation shows an RSVP section and the event lacks it.
 */
export function invitationAddonStep(sources: AddonStepSources, showsRsvp: boolean): InvitationAddonStep | null {
    const mode = featureAddonMode(sources.billing.eventStatus);
    if (!mode) return null;
    const offers = featureAddonOffers({
        paidServices: sources.paidServices,
        platformModules: sources.platformModules,
        plan: eventPlan(sources.planTiers, sources.billing.planTierCode),
        eventModules: sources.eventModules,
        ownedAddons: sources.billing.addons,
        mode,
    });
    const saveMyDate = offers.find((offer) => offer.service.grantsModuleKey === SAVE_MY_DATE_MODULE_KEY);
    if (!saveMyDate) return null;
    const rsvp = showsRsvp ? (offers.find((offer) => offer.service.grantsModuleKey === RSVP_MODULE_KEY) ?? null) : null;
    return { mode, saveMyDate, rsvp };
}

// Whether Publish shows the add-on step: an add-on is sold, and buying isn't paused by a withdrawal.
export function opensInvitationAddonStep(sources: AddonStepSources & { withdrawals: WithdrawalResponseDto[] }): boolean {
    const step = invitationAddonStep(sources, false);
    if (!step) return false;
    return step.mode === 'draft' || !withdrawalPurchaseBlocks(sources.withdrawals, sources.billing.orders).storageBlocked;
}

// The add-on codes the host keeps: Save my date always, RSVP when ticked.
export function addonStepCodes(step: InvitationAddonStep, rsvpTicked: boolean): string[] {
    return [step.saveMyDate.service.code, ...(step.rsvp && rsvpTicked ? [step.rsvp.service.code] : [])];
}

// A draft's opt-ins to change before its activation payment.
export function draftAddonChanges(step: InvitationAddonStep, rsvpTicked: boolean): { add: string[]; remove: string[] } {
    const offers = [step.saveMyDate, ...(step.rsvp ? [step.rsvp] : [])];
    const kept = new Set(addonStepCodes(step, rsvpTicked));
    return {
        add: offers.filter((offer) => !offer.added && kept.has(offer.service.code)).map((offer) => offer.service.code),
        remove: offers.filter((offer) => offer.added && !kept.has(offer.service.code)).map((offer) => offer.service.code),
    };
}

/**
 * A draft's total: its activation quote (plan and the add-ons already opted into) with the step's
 * pending changes at catalogue price, which no discount touches. Null until the quote answers.
 */
export function draftAddonStepTotalMinor(step: InvitationAddonStep, rsvpTicked: boolean, activationTotalMinor: number | null): number | null {
    if (activationTotalMinor === null) return null;
    const { add, remove } = draftAddonChanges(step, rsvpTicked);
    const offers = [step.saveMyDate, ...(step.rsvp ? [step.rsvp] : [])];
    const price = (code: string) => offers.find((offer) => offer.service.code === code)?.service.priceAmountMinor ?? 0;
    return activationTotalMinor + add.reduce((sum, code) => sum + price(code), 0) - remove.reduce((sum, code) => sum + price(code), 0);
}
