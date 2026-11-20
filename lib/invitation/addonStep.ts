import type {
    CoverageOptionResponseDto,
    EventBillingResponseDto,
    EventDetailResponseDto,
    EventMemberResponseDto,
    EventModuleResponseDto,
    PaidServiceResponseDto,
    PlanTierResponseDto,
    PlatformModuleResponseDto,
    PriceBreakdown,
    WithdrawalResponseDto,
} from '@/lib/api/types';
import { isPrimaryHost } from '@/lib/eventLifecycle';
import { type FeatureAddonMode, featureAddonMode, type FeatureAddonOffer, featureAddonOffers, saveMyDateAddon } from '@/lib/featureAddons';
import type { InvitationDocument } from '@/lib/invitation/document';
import { publicAssignableModuleUnlocks } from '@/lib/planModules';
import { getOptionPriceDetails, scopedPlans } from '@/lib/planTiers';
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

// Only the event's main host may buy, as on the event's own pages (usePurchaseBlock).
export function isPrimaryHostOf(eventId: string, memberships: EventMemberResponseDto[], event: Pick<EventDetailResponseDto, 'hosts'>): boolean {
    const member = memberships.find((membership) => membership.eventId === eventId && !membership.deletedAt);
    return isPrimaryHost(event.hosts, member?.id);
}

/**
 * A draft's activation quote without the step's own add-ons, which the step lists as choices:
 * the plan and any other add-on the draft already opted into.
 */
export function draftQuoteOtherItems(breakdown: PriceBreakdown, step: InvitationAddonStep): PriceBreakdown {
    const stepCodes = new Set([step.saveMyDate.service.code, ...(step.rsvp ? [step.rsvp.service.code] : [])]);
    return { ...breakdown, items: breakdown.items.filter((item) => !item.paidServiceCode || !stepCodes.has(item.paidServiceCode)) };
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

// A new event's add-ons on one plan (KAN-82): Save my date when the plan lacks it, and RSVP when
// the invitation shows an RSVP section and the plan sells it.
export type InvitationPlanAddons = {
    saveMyDate: PaidServiceResponseDto | null;
    rsvp: PaidServiceResponseDto | null;
};

export function invitationPlanAddons(
    plan: PlanTierResponseDto | null | undefined,
    paidServices: PaidServiceResponseDto[],
    platformModules: PlatformModuleResponseDto[],
    showsRsvp: boolean,
): InvitationPlanAddons {
    return {
        saveMyDate: saveMyDateAddon(paidServices, platformModules, plan),
        rsvp: showsRsvp
            ? (publicAssignableModuleUnlocks(paidServices, platformModules, plan).find((service) => service.grantsModuleKey === RSVP_MODULE_KEY) ??
              null)
            : null,
    };
}

// The add-on codes a new event takes: Save my date when its plan lacks it, RSVP when ticked.
export function invitationPlanAddonCodes(addons: InvitationPlanAddons, rsvpTicked: boolean): string[] {
    return [...(addons.saveMyDate ? [addons.saveMyDate.code] : []), ...(addons.rsvp && rsvpTicked ? [addons.rsvp.code] : [])];
}

// What a retry changes on the made event: the opt-ins it still lacks, and those the host has since dropped.
export function retryAddonChanges(chosen: string[], applied: string[]): { add: string[]; remove: string[] } {
    return { add: chosen.filter((code) => !applied.includes(code)), remove: applied.filter((code) => !chosen.includes(code)) };
}

// A new event's total before it is made, from the prices its cards show: the chosen length after the
// plan's promotion, plus the add-ons the host takes. None when a price is missing or in another currency.
export function invitationPlanTotal(
    plan: PlanTierResponseDto | null | undefined,
    option: CoverageOptionResponseDto | null | undefined,
    addons: InvitationPlanAddons,
    rsvpTicked: boolean,
): { amountMinor: number; currency: string } | null {
    const price = plan && option ? getOptionPriceDetails(plan, option) : null;
    if (!price) return null;
    const extras = [addons.saveMyDate, rsvpTicked ? addons.rsvp : null].filter((service) => service !== null);
    if (extras.some((service) => service.priceCurrency !== price.currency)) return null;
    return { amountMinor: extras.reduce((sum, service) => sum + service.priceAmountMinor, price.amountMinor), currency: price.currency };
}
