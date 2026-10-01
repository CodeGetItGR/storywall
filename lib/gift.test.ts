import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import type { GiftHandoverResponseDto } from '@/lib/api/types';
import {
    canEditGift,
    canIssueGiftCard,
    canPrintGiftCard,
    giftCardIsLive,
    giftClaimRefusal,
    giftDetailsFromHandover,
    giftRequestFromInput,
    giftStatusCopy,
    inviteGiftFraming,
    isGiftHandoverPending,
    isGiftPinFormat,
    isPlanGiftable,
    sameGiftRequest,
} from '@/lib/gift';

function gift(overrides: Partial<GiftHandoverResponseDto> = {}): GiftHandoverResponseDto {
    return {
        status: 'NOT_ISSUED',
        recipientLabel: 'Anna & Nikos',
        giverDisplayName: 'Maria',
        recipientEmail: null,
        token: null,
        cardIssuedAt: null,
        claimedByDisplayName: null,
        claimedAt: null,
        ownershipTransfersAt: null,
        ownershipTransferredAt: null,
        ...overrides,
    };
}

describe('isPlanGiftable', () => {
    it('needs the flag and co-hosts', () => {
        expect(isPlanGiftable({ isGiftable: true, moduleKeys: ['co_hosts'] })).toBe(true);
        expect(isPlanGiftable({ isGiftable: false, moduleKeys: ['co_hosts'] })).toBe(false);
        expect(isPlanGiftable({ isGiftable: true, moduleKeys: [] })).toBe(false);
        expect(isPlanGiftable(undefined)).toBe(false);
    });
});

describe('giftRequestFromInput', () => {
    it('trims and leaves out an empty email', () => {
        expect(giftRequestFromInput({ recipientLabel: ' Anna ', giverDisplayName: ' Maria ', recipientEmail: '  ' })).toEqual({
            recipientLabel: 'Anna',
            giverDisplayName: 'Maria',
        });
    });

    it('keeps the email when given', () => {
        expect(giftRequestFromInput({ recipientLabel: 'Anna', giverDisplayName: 'Maria', recipientEmail: 'a@b.co ' })).toEqual({
            recipientLabel: 'Anna',
            giverDisplayName: 'Maria',
            recipientEmail: 'a@b.co',
        });
    });

    it('is null while a required field is empty', () => {
        expect(giftRequestFromInput({ recipientLabel: ' ', giverDisplayName: 'Maria', recipientEmail: '' })).toBeNull();
        expect(giftRequestFromInput({ recipientLabel: 'Anna', giverDisplayName: '', recipientEmail: '' })).toBeNull();
    });
});

describe('giftDetailsFromHandover / sameGiftRequest', () => {
    it('fills the form from a gift', () => {
        expect(giftDetailsFromHandover(gift({ recipientEmail: 'a@b.co' }))).toEqual({
            recipientLabel: 'Anna & Nikos',
            giverDisplayName: 'Maria',
            recipientEmail: 'a@b.co',
        });
        expect(giftDetailsFromHandover(null).recipientLabel).toBe('');
    });

    it('treats a missing email as empty', () => {
        expect(
            sameGiftRequest({ recipientLabel: 'A', giverDisplayName: 'B' }, { recipientLabel: 'A', giverDisplayName: 'B', recipientEmail: '' }),
        ).toBe(true);
        expect(sameGiftRequest({ recipientLabel: 'A', giverDisplayName: 'B' }, { recipientLabel: 'A', giverDisplayName: 'C' })).toBe(false);
        expect(sameGiftRequest(null, { recipientLabel: 'A', giverDisplayName: 'B' })).toBe(false);
    });
});

describe('gift state helpers', () => {
    it('locks editing once claimed', () => {
        expect(canEditGift(gift({ status: 'ISSUED' }))).toBe(true);
        expect(canEditGift(gift({ status: 'CLAIMED' }))).toBe(false);
        expect(canEditGift(gift({ status: 'COMPLETED' }))).toBe(false);
    });

    it('issues a card only on an active event', () => {
        expect(canIssueGiftCard(gift(), true)).toBe(true);
        expect(canIssueGiftCard(gift(), false)).toBe(false);
        expect(canIssueGiftCard(gift({ status: 'CLAIMED' }), true)).toBe(false);
    });

    it('knows a live and printable card', () => {
        expect(giftCardIsLive(gift({ status: 'ISSUED', token: 't' }))).toBe(true);
        expect(giftCardIsLive(gift({ status: 'LOCKED', token: 't' }))).toBe(true);
        expect(giftCardIsLive(gift({ status: 'ISSUED', token: null }))).toBe(false);
        expect(canPrintGiftCard(gift({ status: 'ISSUED', token: 't' }))).toBe(true);
        expect(canPrintGiftCard(gift({ status: 'LOCKED', token: 't' }))).toBe(false);
    });

    it('marks a claimed gift as a pending handover', () => {
        expect(isGiftHandoverPending(gift({ status: 'CLAIMED' }))).toBe(true);
        expect(isGiftHandoverPending(gift({ status: 'COMPLETED' }))).toBe(false);
        expect(isGiftHandoverPending(null)).toBe(false);
    });

    it('checks the PIN format', () => {
        expect(isGiftPinFormat('123456')).toBe(true);
        expect(isGiftPinFormat('12345')).toBe(false);
        expect(isGiftPinFormat('12345a')).toBe(false);
    });
});

describe('giftClaimRefusal', () => {
    it('asks for the PIN with the tries left (3036)', () => {
        expect(giftClaimRefusal(new ApiError(400, { errorCode: 3036, details: { attemptsLeft: 3 } }))).toEqual({ kind: 'pin', attemptsLeft: 3 });
        expect(giftClaimRefusal(new ApiError(400, { errorCode: 3036 }))).toEqual({ kind: 'pin', attemptsLeft: null });
    });

    it('locks the card on the last wrong PIN or 5091', () => {
        expect(giftClaimRefusal(new ApiError(400, { errorCode: 3036, details: { attemptsLeft: 0 } }))).toEqual({ kind: 'locked' });
        expect(giftClaimRefusal(new ApiError(409, { errorCode: 5091 }))).toEqual({ kind: 'locked' });
    });

    it('maps 5090 and 404', () => {
        expect(giftClaimRefusal(new ApiError(409, { errorCode: 5090 }))).toEqual({ kind: 'claimed' });
        expect(giftClaimRefusal(new ApiError(404, {}))).toEqual({ kind: 'notFound' });
    });

    it('falls back to a message', () => {
        expect(giftClaimRefusal(new ApiError(403, { errorCode: 4009 }))).toEqual({ kind: 'message' });
        expect(giftClaimRefusal(new Error('network'))).toEqual({ kind: 'message' });
    });
});

describe('giftStatusCopy', () => {
    it('names the transfer date while claimed', () => {
        expect(giftStatusCopy(gift({ status: 'CLAIMED', ownershipTransfersAt: '2026-10-10T00:00:00Z' }))).toEqual({
            key: 'CLAIMED',
            date: '2026-10-10T00:00:00Z',
        });
    });

    it('reads "soon" while the handover is paused', () => {
        expect(giftStatusCopy(gift({ status: 'CLAIMED' }))).toEqual({ key: 'CLAIMED_SOON', date: null });
    });

    it('covers the other states', () => {
        expect(giftStatusCopy(gift({ status: 'COMPLETED', ownershipTransferredAt: 'x' }))).toEqual({ key: 'COMPLETED', date: 'x' });
        expect(giftStatusCopy(gift({ status: 'ISSUED', cardIssuedAt: 'y' }))).toEqual({ key: 'ISSUED', date: 'y' });
        expect(giftStatusCopy(gift({ status: 'VOID' }))).toEqual({ key: 'VOID', date: null });
    });
});

describe('inviteGiftFraming', () => {
    it('shows the framing only once claimed', () => {
        const framing = { giverDisplayName: 'Maria', recipientLabel: 'Anna', claimed: true };
        expect(inviteGiftFraming(framing)).toBe(framing);
        expect(inviteGiftFraming({ ...framing, claimed: false })).toBeNull();
        expect(inviteGiftFraming(null)).toBeNull();
    });
});
