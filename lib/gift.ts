import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { GiftClaimState, GiftFramingDto, GiftHandoverRequestDto, GiftHandoverResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

// Server limits for PUT /api/events/{id}/gift.
export const GIFT_RECIPIENT_LABEL_MAX_LENGTH = 120;
export const GIFT_GIVER_NAME_MAX_LENGTH = 80;
export const GIFT_RECIPIENT_EMAIL_MAX_LENGTH = 255;
export const GIFT_PIN_LENGTH = 6;

// A plan can be given only when the admin allows it and it has co-hosts: the
// recipient joins as a co-host and the giver stays one.
export function isPlanGiftable(plan: Pick<PlanTierResponseDto, 'isGiftable' | 'moduleKeys'> | null | undefined): boolean {
    return Boolean(plan?.isGiftable && plan.moduleKeys.includes('co_hosts'));
}

export type GiftDetailsInput = { recipientLabel: string; giverDisplayName: string; recipientEmail: string };

export const EMPTY_GIFT_DETAILS: GiftDetailsInput = { recipientLabel: '', giverDisplayName: '', recipientEmail: '' };

export function giftDetailsFromHandover(gift: GiftHandoverResponseDto | null | undefined): GiftDetailsInput {
    if (!gift) return EMPTY_GIFT_DETAILS;
    return { recipientLabel: gift.recipientLabel, giverDisplayName: gift.giverDisplayName, recipientEmail: gift.recipientEmail ?? '' };
}

// The PUT body, or null while a required field is empty. A full replace: an
// empty email is left out, which clears it.
export function giftRequestFromInput(input: GiftDetailsInput): GiftHandoverRequestDto | null {
    const recipientLabel = input.recipientLabel.trim();
    const giverDisplayName = input.giverDisplayName.trim();
    const recipientEmail = input.recipientEmail.trim();
    if (!recipientLabel || !giverDisplayName) return null;
    return { recipientLabel, giverDisplayName, ...(recipientEmail ? { recipientEmail } : {}) };
}

export function sameGiftRequest(left: GiftHandoverRequestDto | null, right: GiftHandoverRequestDto | null): boolean {
    return (
        left?.recipientLabel === right?.recipientLabel &&
        left?.giverDisplayName === right?.giverDisplayName &&
        (left?.recipientEmail ?? '') === (right?.recipientEmail ?? '')
    );
}

// The details stay editable until the gift is claimed (5090 after that).
export function canEditGift(gift: Pick<GiftHandoverResponseDto, 'status'>): boolean {
    return gift.status !== 'CLAIMED' && gift.status !== 'COMPLETED';
}

// A card can be issued once the event is paid for, and reissued until it is claimed.
export function canIssueGiftCard(gift: Pick<GiftHandoverResponseDto, 'status'>, eventActive: boolean): boolean {
    return eventActive && canEditGift(gift);
}

// Reissuing kills a card that may already be printed, so it asks first.
export function giftCardIsLive(gift: Pick<GiftHandoverResponseDto, 'token' | 'status'>): boolean {
    return Boolean(gift.token) && (gift.status === 'ISSUED' || gift.status === 'LOCKED');
}

// While a claimed gift waits for its handover, nobody can move ownership by hand (5093).
export function isGiftHandoverPending(gift: Pick<GiftHandoverResponseDto, 'status'> | null | undefined): boolean {
    return gift?.status === 'CLAIMED';
}

export function giftClaimUrl(origin: string, token: string): string {
    return `${origin}${routes.giftClaim(token)}`;
}

// An unknown state is treated as not claimable.
export function isGiftClaimable(state: GiftClaimState | string): boolean {
    return state === 'CLAIMABLE';
}

export function isGiftPinFormat(pin: string): boolean {
    return new RegExp(`^\\d{${GIFT_PIN_LENGTH}}$`).test(pin);
}

// `details.attemptsLeft` on a 3036, when present.
export function giftPinAttemptsLeft(error: unknown): number | null {
    if (getErrorCode(error) !== ERROR_CODES.GIFT_CLAIM_PIN_INVALID || !(error instanceof ApiError)) return null;
    const details = error.problem?.details;
    if (typeof details !== 'object' || details === null || !('attemptsLeft' in details)) return null;
    const { attemptsLeft } = details as { attemptsLeft: unknown };
    return typeof attemptsLeft === 'number' ? attemptsLeft : null;
}

// What the claim page does after a refused claim: ask for the PIN, show the
// card as locked or used, or show the message and let the visitor retry.
export type GiftClaimRefusal =
    { kind: 'pin'; attemptsLeft: number | null } | { kind: 'locked' } | { kind: 'claimed' } | { kind: 'notFound' } | { kind: 'message' };

export function giftClaimRefusal(error: unknown): GiftClaimRefusal {
    if (error instanceof ApiError && error.status === 404) return { kind: 'notFound' };
    const code = getErrorCode(error);
    if (code === ERROR_CODES.GIFT_CLAIM_PIN_INVALID) {
        const attemptsLeft = giftPinAttemptsLeft(error);
        // 0: this wrong PIN locked the card.
        return attemptsLeft === 0 ? { kind: 'locked' } : { kind: 'pin', attemptsLeft };
    }
    if (code === ERROR_CODES.GIFT_CARD_LOCKED) return { kind: 'locked' };
    if (code === ERROR_CODES.GIFT_ALREADY_CLAIMED) return { kind: 'claimed' };
    return { kind: 'message' };
}

// Which status line the gift section shows, and the date it names. A claimed
// gift with no transfer date is paused (a withdrawal under review, for one), so
// it reads "soon" rather than a date.
export type GiftStatusCopyKey = 'NOT_ISSUED' | 'ISSUED' | 'LOCKED' | 'CLAIMED' | 'CLAIMED_SOON' | 'COMPLETED' | 'VOID';

export function giftStatusCopy(gift: GiftHandoverResponseDto): { key: GiftStatusCopyKey; date: string | null } {
    switch (gift.status) {
        case 'CLAIMED':
            return gift.ownershipTransfersAt ? { key: 'CLAIMED', date: gift.ownershipTransfersAt } : { key: 'CLAIMED_SOON', date: null };
        case 'COMPLETED':
            return { key: 'COMPLETED', date: gift.ownershipTransferredAt };
        case 'ISSUED':
            return { key: 'ISSUED', date: gift.cardIssuedAt };
        case 'LOCKED':
        case 'VOID':
        case 'NOT_ISSUED':
            return { key: gift.status, date: null };
        default:
            return { key: 'NOT_ISSUED', date: null };
    }
}

// The card can be printed while it is live and usable.
export function canPrintGiftCard(gift: Pick<GiftHandoverResponseDto, 'token' | 'status'>): boolean {
    return Boolean(gift.token) && gift.status === 'ISSUED';
}

// The invite page's "a gift from … for …" line. Until the gift is claimed the
// honorees may not know yet, and guests could pass it on, so it stays hidden.
export function inviteGiftFraming(gift: GiftFramingDto | null | undefined): GiftFramingDto | null {
    return gift?.claimed ? gift : null;
}
