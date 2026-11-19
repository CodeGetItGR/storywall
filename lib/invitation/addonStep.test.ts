import { describe, expect, it } from 'vitest';

import type {
    EventAddonDto,
    EventBillingResponseDto,
    EventMemberResponseDto,
    EventModuleResponseDto,
    EventStatus,
    PaidServiceResponseDto,
    PlanTierResponseDto,
    PlatformModuleResponseDto,
    PriceBreakdown,
    WithdrawalResponseDto,
} from '@/lib/api/types';
import {
    addonStepCodes,
    draftAddonChanges,
    draftAddonStepTotalMinor,
    draftQuoteOtherItems,
    invitationAddonStep,
    invitationPlanAddonCodes,
    invitationPlanAddons,
    isPrimaryHostOf,
    opensInvitationAddonStep,
    retryAddonChanges,
    showsRsvpSection,
} from '@/lib/invitation/addonStep';
import type { InvitationDocument } from '@/lib/invitation/document';

function unlock(code: string, moduleKey: string, priceAmountMinor: number): PaidServiceResponseDto {
    return {
        id: `svc-${code}`,
        code,
        kind: 'MODULE_UNLOCK',
        name: code,
        description: null,
        sortOrder: 0,
        isAssignable: true,
        isPublic: true,
        priceAmountMinor,
        priceCurrency: 'EUR',
        billingPeriod: 'ONE_TIME',
        grantsStorageBytes: null,
        grantsModuleKey: moduleKey,
        planTierIds: [],
    };
}

const saveMyDate = unlock('SMD', 'save_my_date', 2900);
const rsvp = unlock('RSVP', 'rsvp', 900);
const platformModules = ['posts', 'rsvp', 'save_my_date'].map(
    (moduleKey, sortOrder) =>
        ({ id: moduleKey, moduleKey, name: moduleKey, description: null, isEnabled: true, sortOrder }) as PlatformModuleResponseDto,
);
const lite = { id: 'plan-lite', code: 'LITE', scope: 'EVENT', sortOrder: 0, moduleKeys: ['posts'] } as unknown as PlanTierResponseDto;
const full = { id: 'plan-full', code: 'FULL', scope: 'EVENT', sortOrder: 1, moduleKeys: ['posts', 'save_my_date'] } as unknown as PlanTierResponseDto;

function moduleRow(moduleKey: string): EventModuleResponseDto {
    return { id: moduleKey, moduleKey, isEnabled: true } as EventModuleResponseDto;
}

function addon(code: string): EventAddonDto {
    return { code, name: code, priceAmountMinor: 900, billingPeriod: 'ONE_TIME', activatedAt: '' };
}

function sources(eventStatus: EventStatus = 'ACTIVE', planTierCode = 'LITE', addons: EventAddonDto[] = []) {
    return {
        paidServices: [saveMyDate, rsvp],
        platformModules,
        planTiers: [lite, full],
        billing: { eventStatus, planTierCode, addons, orders: [] } as Pick<
            EventBillingResponseDto,
            'eventStatus' | 'planTierCode' | 'addons' | 'orders'
        >,
        eventModules: [moduleRow('posts')],
    };
}

function document(visible: boolean | null): InvitationDocument {
    return { sections: visible === null ? [] : [{ type: 'rsvp', visible }] } as unknown as InvitationDocument;
}

describe('showsRsvpSection', () => {
    it('is true only for a visible RSVP section', () => {
        expect(showsRsvpSection(document(true))).toBe(true);
        expect(showsRsvpSection(document(false))).toBe(false);
        expect(showsRsvpSection(document(null))).toBe(false);
    });
});

describe('invitationAddonStep', () => {
    it('offers Save my date, and RSVP when the invitation asks for replies', () => {
        expect(invitationAddonStep(sources(), true)).toEqual({
            mode: 'checkout',
            saveMyDate: { service: saveMyDate, added: false },
            rsvp: { service: rsvp, added: false },
        });
    });

    it('leaves RSVP out when the invitation shows no RSVP section', () => {
        expect(invitationAddonStep(sources(), false)?.rsvp).toBeNull();
    });

    it('leaves RSVP out when the event already has it', () => {
        expect(invitationAddonStep({ ...sources(), eventModules: [moduleRow('posts'), moduleRow('rsvp')] }, true)?.rsvp).toBeNull();
    });

    it('is null when the plan includes the invitation or no add-on is sold', () => {
        expect(invitationAddonStep(sources('ACTIVE', 'FULL'), true)).toBeNull();
        expect(invitationAddonStep({ ...sources(), paidServices: [rsvp] }, true)).toBeNull();
    });

    it("keeps a draft's earlier opt-ins marked as added", () => {
        const step = invitationAddonStep(sources('DRAFT', 'LITE', [addon('RSVP')]), true);
        expect(step?.mode).toBe('draft');
        expect(step?.rsvp).toEqual({ service: rsvp, added: true });
    });
});

describe('opensInvitationAddonStep', () => {
    const held = [{ status: 'HELD', scope: 'EVENT' }] as WithdrawalResponseDto[];

    it('opens when an add-on is sold and buying is not paused', () => {
        expect(opensInvitationAddonStep({ ...sources(), withdrawals: [] })).toBe(true);
    });

    it('stays shut while a whole-event withdrawal is under review', () => {
        expect(opensInvitationAddonStep({ ...sources(), withdrawals: held })).toBe(false);
    });

    it('stays shut when nothing is sold for the plan', () => {
        expect(opensInvitationAddonStep({ ...sources('ACTIVE', 'FULL'), withdrawals: [] })).toBe(false);
    });
});

describe('the codes and changes the step sends', () => {
    const live = invitationAddonStep(sources(), true)!;
    const draft = invitationAddonStep(sources('DRAFT', 'LITE', [addon('RSVP')]), true)!;

    it('always keeps Save my date and adds RSVP when ticked', () => {
        expect(addonStepCodes(live, false)).toEqual(['SMD']);
        expect(addonStepCodes(live, true)).toEqual(['SMD', 'RSVP']);
    });

    it("adds what a draft lacks and removes an earlier RSVP that's unticked", () => {
        expect(draftAddonChanges(draft, true)).toEqual({ add: ['SMD'], remove: [] });
        expect(draftAddonChanges(draft, false)).toEqual({ add: ['SMD'], remove: ['RSVP'] });
    });

    it("prices a draft's total from its activation quote and the pending changes", () => {
        // The quote already holds the RSVP opt-in: Save my date is added, RSVP taken off when unticked.
        expect(draftAddonStepTotalMinor(draft, true, 10_000)).toBe(12_900);
        expect(draftAddonStepTotalMinor(draft, false, 10_000)).toBe(12_000);
        expect(draftAddonStepTotalMinor(draft, true, null)).toBeNull();
    });

    it("lists a draft's plan and other add-ons apart from the step's own", () => {
        const quote = {
            totalMinor: 13_400,
            items: [
                { code: 'ACTIVATION', paidServiceCode: null },
                { code: 'ADDON', paidServiceCode: 'GUESTBOOK' },
                { code: 'ADDON', paidServiceCode: 'RSVP' },
            ],
        } as unknown as PriceBreakdown;
        expect(draftQuoteOtherItems(quote, draft).items.map((item) => item.paidServiceCode)).toEqual([null, 'GUESTBOOK']);
        expect(draftQuoteOtherItems(quote, draft).totalMinor).toBe(13_400);
    });
});

describe('isPrimaryHostOf', () => {
    const memberships = [{ id: 'mem-1', eventId: 'evt-1', deletedAt: null }] as EventMemberResponseDto[];
    const host = (memberId: string, displayOrder: number) => ({ id: memberId, eventId: 'evt-1', memberId, displayOrder, createdAt: '' });

    it("is true only for the event's main host", () => {
        expect(isPrimaryHostOf('evt-1', memberships, { hosts: [host('mem-1', 0)] })).toBe(true);
        expect(isPrimaryHostOf('evt-1', memberships, { hosts: [host('mem-0', 0), host('mem-1', 1)] })).toBe(false);
        expect(isPrimaryHostOf('evt-2', memberships, { hosts: [host('mem-1', 0)] })).toBe(false);
    });
});

describe('invitationPlanAddons', () => {
    it('sells Save my date on a plan without it, and RSVP when the invitation asks for replies', () => {
        expect(invitationPlanAddons(lite, [saveMyDate, rsvp], platformModules, true)).toEqual({ saveMyDate, rsvp });
        expect(invitationPlanAddons(lite, [saveMyDate, rsvp], platformModules, false)).toEqual({ saveMyDate, rsvp: null });
    });

    it('offers RSVP alone on a plan that has the invitation', () => {
        expect(invitationPlanAddons(full, [saveMyDate, rsvp], platformModules, true)).toEqual({ saveMyDate: null, rsvp });
    });

    it('offers nothing when no plan is chosen', () => {
        expect(invitationPlanAddons(null, [saveMyDate, rsvp], platformModules, true)).toEqual({ saveMyDate: null, rsvp: null });
    });

    it('lists the codes to opt into', () => {
        const addons = invitationPlanAddons(lite, [saveMyDate, rsvp], platformModules, true);
        expect(invitationPlanAddonCodes(addons, false)).toEqual(['SMD']);
        expect(invitationPlanAddonCodes(addons, true)).toEqual(['SMD', 'RSVP']);
        expect(invitationPlanAddonCodes({ saveMyDate: null, rsvp: null }, true)).toEqual([]);
    });
});

describe('retryAddonChanges', () => {
    it('adds only what is new and removes what was dropped', () => {
        expect(retryAddonChanges(['SMD', 'RSVP'], [])).toEqual({ add: ['SMD', 'RSVP'], remove: [] });
        expect(retryAddonChanges(['SMD'], ['SMD', 'RSVP'])).toEqual({ add: [], remove: ['RSVP'] });
        expect(retryAddonChanges(['SMD', 'RSVP'], ['SMD'])).toEqual({ add: ['RSVP'], remove: [] });
    });
});
