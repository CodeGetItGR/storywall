import { describe, expect, it } from 'vitest';

import {
    collaboratorRequestFromFormData,
    collaboratorRequestWithStatus,
    earningCodeText,
    filterCollaborators,
    filterEarnings,
    formatCurrencyAmounts,
    owedAmounts,
    shortId,
    sortCodesActiveFirst,
    sortCollaboratorsByName,
    sumByCurrency,
    voidableEarningIds,
} from '@/lib/adminCollaborations';
import type { CollaborationCodeResponseDto, CollaborationEarningResponseDto, CollaboratorResponseDto } from '@/lib/api/types';

function collaborator(overrides: Partial<CollaboratorResponseDto> = {}): CollaboratorResponseDto {
    return {
        id: 'c1',
        name: 'Barn Venue',
        contactEmail: 'hello@barn.test',
        status: 'ACTIVE',
        portalTokenIssued: false,
        portalTokenIssuedAt: null,
        notes: null,
        earningsTotals: [],
        ...overrides,
    };
}

function earning(overrides: Partial<CollaborationEarningResponseDto> = {}): CollaborationEarningResponseDto {
    return {
        id: 'e1',
        eventId: 'ev1',
        eventTitle: 'Anna & Nikos',
        orderId: 'o1',
        codeId: 'k1',
        entryType: 'ACCRUAL',
        amountMinor: 1800,
        currency: 'EUR',
        commissionPercent: 15,
        basisAmountMinor: 12000,
        status: 'ACCRUED',
        accruedAt: '2026-08-31T10:15:00Z',
        paidAt: null,
        payoutReference: null,
        ...overrides,
    };
}

function code(overrides: Partial<CollaborationCodeResponseDto> = {}): CollaborationCodeResponseDto {
    return {
        id: 'k1',
        collaboratorId: 'c1',
        code: 'BARN-2026',
        label: 'Barn rate',
        discountPercent: 10,
        commissionPercent: 15,
        status: 'ACTIVE',
        startsAt: null,
        endsAt: null,
        maxRedemptions: null,
        liveRedemptions: 0,
        eventTypeKeys: [],
        planTierCodes: [],
        ...overrides,
    };
}

describe('sortCollaboratorsByName', () => {
    it('sorts by name without mutating the input', () => {
        const input = [collaborator({ id: 'z', name: 'Zeta' }), collaborator({ id: 'a', name: 'alpha' }), collaborator({ id: 'm', name: 'Mid' })];
        expect(sortCollaboratorsByName(input).map((item) => item.id)).toEqual(['a', 'm', 'z']);
        expect(input[0].id).toBe('z');
    });
});

describe('filterCollaborators', () => {
    const list = [collaborator({ id: 'a', name: 'Barn Venue' }), collaborator({ id: 'b', name: 'Lake House', contactEmail: 'info@lake.test' })];

    it('returns everything for a blank search', () => {
        expect(filterCollaborators(list, '  ')).toHaveLength(2);
    });

    it('matches name and email case-insensitively', () => {
        expect(filterCollaborators(list, 'barn').map((item) => item.id)).toEqual(['a']);
        expect(filterCollaborators(list, 'LAKE.TEST').map((item) => item.id)).toEqual(['b']);
    });
});

describe('owedAmounts', () => {
    it('keeps only currencies with something owed', () => {
        expect(
            owedAmounts([
                { currency: 'EUR', accruedMinor: 3043, paidMinor: 0 },
                { currency: 'USD', accruedMinor: 0, paidMinor: 500 },
            ]),
        ).toEqual([{ currency: 'EUR', amountMinor: 3043 }]);
    });
});

describe('sortCodesActiveFirst', () => {
    it('puts disabled codes last and keeps order within groups', () => {
        const input = [code({ id: 'a', status: 'DISABLED' }), code({ id: 'b' }), code({ id: 'c' })];
        expect(sortCodesActiveFirst(input).map((item) => item.id)).toEqual(['b', 'c', 'a']);
    });
});

describe('filterEarnings', () => {
    const rows = [earning({ id: 'a' }), earning({ id: 'p', status: 'PAID' }), earning({ id: 'r', status: 'REVERSED' })];

    it('OPEN hides reversed rows', () => {
        expect(filterEarnings(rows, 'OPEN').map((row) => row.id)).toEqual(['a', 'p']);
    });

    it('a status filter keeps only that status', () => {
        expect(filterEarnings(rows, 'PAID').map((row) => row.id)).toEqual(['p']);
    });

    it('ALL keeps everything', () => {
        expect(filterEarnings(rows, 'ALL')).toHaveLength(3);
    });
});

describe('voidableEarningIds', () => {
    it('allows open and paid accruals whose event was never voided', () => {
        const rows = [earning({ id: 'a' }), earning({ id: 'p', eventId: 'ev2', status: 'PAID' })];
        expect([...voidableEarningIds(rows)].sort()).toEqual(['a', 'p']);
    });

    it('blocks a paid accrual once its event has a clawback', () => {
        const rows = [earning({ id: 'p', status: 'PAID' }), earning({ id: 'c', entryType: 'CLAWBACK', amountMinor: -1800 })];
        expect(voidableEarningIds(rows).size).toBe(0);
    });

    it('keeps an accrual voidable after a partial-withdrawal clawback', () => {
        const rows = [earning({ id: 'a', amountMinor: 1800 }), earning({ id: 'c', entryType: 'CLAWBACK', amountMinor: -600 })];
        expect([...voidableEarningIds(rows)]).toEqual(['a']);
    });

    it('blocks reversed rows and every row of their event', () => {
        const rows = [earning({ id: 'r', status: 'REVERSED' }), earning({ id: 'a' }), earning({ id: 'b', eventId: 'ev2' })];
        expect([...voidableEarningIds(rows)]).toEqual(['b']);
    });
});

describe('shortId / earningCodeText', () => {
    it('shortens an id to 8 characters', () => {
        expect(shortId('9c1e4f2a-1111-2222')).toBe('9c1e4f2a');
    });

    it('resolves a code string, falling back to a short id', () => {
        expect(earningCodeText([code()], 'k1')).toBe('BARN-2026');
        expect(earningCodeText([code()], 'deadbeef-0000')).toBe('deadbeef');
    });
});

describe('sumByCurrency', () => {
    it('sums signed amounts per currency, never across', () => {
        expect(
            sumByCurrency([
                earning({ amountMinor: 1800 }),
                earning({ id: 'c', entryType: 'CLAWBACK', amountMinor: -300 }),
                earning({ id: 'u', currency: 'USD', amountMinor: 500 }),
            ]),
        ).toEqual([
            { currency: 'EUR', amountMinor: 1500 },
            { currency: 'USD', amountMinor: 500 },
        ]);
    });
});

describe('formatCurrencyAmounts', () => {
    it('joins one formatted figure per currency', () => {
        const text = formatCurrencyAmounts('en', [
            { currency: 'EUR', amountMinor: 3043 },
            { currency: 'USD', amountMinor: 1200 },
        ]);
        expect(text.split(' · ')).toHaveLength(2);
        expect(text).toContain('30.43');
        expect(text).toContain('12.00');
    });
});

describe('collaboratorRequestFromFormData', () => {
    it('trims, lowercases the email, and never sends a status', () => {
        const formData = new FormData();
        formData.set('name', '  Barn Venue ');
        formData.set('contactEmail', ' Hello@Barn.TEST ');
        formData.set('notes', '   ');
        expect(collaboratorRequestFromFormData(formData)).toEqual({
            name: 'Barn Venue',
            contactEmail: 'hello@barn.test',
            notes: null,
            status: null,
        });
    });
});

describe('collaboratorRequestWithStatus', () => {
    it('sends the current details back with the new status', () => {
        expect(collaboratorRequestWithStatus(collaborator({ notes: 'Renewed' }), 'SUSPENDED')).toEqual({
            name: 'Barn Venue',
            contactEmail: 'hello@barn.test',
            notes: 'Renewed',
            status: 'SUSPENDED',
        });
    });
});
