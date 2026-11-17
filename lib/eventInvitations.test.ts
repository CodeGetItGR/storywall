import { describe, expect, it } from 'vitest';

import type { EventInvitationResponseDto } from '@/lib/api/types';

import { invitationExpiry, selectCoHostInvitations, selectPendingCoHostInvitations } from './eventInvitations';

function invitation(overrides: Partial<EventInvitationResponseDto>): EventInvitationResponseDto {
    return {
        id: 'i1',
        eventId: 'e1',
        inviteCode: 'ABC',
        inviteToken: 't1',
        email: 'eleni@example.com',
        firstName: null,
        lastName: null,
        maxGuests: 1,
        expiresAt: null,
        usedAt: null,
        createdAt: '2026-11-01T10:00:00Z',
        role: 'HOST',
        ...overrides,
    };
}

describe('selectCoHostInvitations', () => {
    it('keeps host invitations only', () => {
        const guest = invitation({ id: 'g', role: 'ATTENDEE' as never });
        const host = invitation({ id: 'h' });
        expect(selectCoHostInvitations([guest, host])).toEqual([host]);
    });
});

describe('selectPendingCoHostInvitations', () => {
    it('leaves out claimed invitations', () => {
        const claimed = invitation({ id: 'c', usedAt: '2026-11-02T10:00:00Z' });
        const pending = invitation({ id: 'p' });
        expect(selectPendingCoHostInvitations([claimed, pending])).toEqual([pending]);
    });
});

describe('invitationExpiry', () => {
    const now = new Date('2026-11-17T12:00:00Z');

    it('is null without an expiry date', () => {
        expect(invitationExpiry(invitation({}), now)).toBeNull();
    });

    it('gives the date while it is still open', () => {
        expect(invitationExpiry(invitation({ expiresAt: '2026-11-20T10:00:00Z' }), now)).toEqual({ kind: 'expires', at: '2026-11-20T10:00:00Z' });
    });

    it('says expired once the date has passed', () => {
        expect(invitationExpiry(invitation({ expiresAt: '2026-11-17T11:59:59Z' }), now)).toEqual({ kind: 'expired' });
    });
});
