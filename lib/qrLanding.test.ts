import { describe, expect, it } from 'vitest';

import type { QrLinkResolutionDto } from '@/lib/api/types';
import { qrLandingChoiceHref, qrLandingPlan, qrLandingStart, resolveQrLandingToken } from '@/lib/qrLanding';
import { routes } from '@/lib/routes';

const guest = { isMember: false, hasWishbook: false };
const member = { isMember: true, hasWishbook: false };

function resolution(overrides: Partial<QrLinkResolutionDto>): QrLinkResolutionDto {
    return { status: 'ACTIVE', targetType: 'EVENT_JOIN', eventId: 'e1', ...overrides } as QrLinkResolutionDto;
}

describe('qrLandingPlan', () => {
    it('offers join and upload on a join code whose event takes uploads', () => {
        const plan = qrLandingPlan(resolution({ inviteToken: 'inv', uploadToken: 'up' }), guest);
        expect(plan).toEqual({ choices: ['join', 'upload'], joinInviteToken: 'inv', uploadToken: 'up', wishToken: null });
    });

    it('offers only join on a join code without an upload code', () => {
        expect(qrLandingPlan(resolution({ inviteToken: 'inv' }), guest).choices).toEqual(['join']);
    });

    it('offers join and upload on an old printed upload code, uploading on the scanned code', () => {
        const plan = qrLandingPlan(resolution({ targetType: 'MEDIA_UPLOAD', joinInviteToken: 'inv' }), guest);
        expect(plan).toEqual({ choices: ['join', 'upload'], joinInviteToken: 'inv', uploadToken: 'self', wishToken: null });
    });

    it('offers upload and wish on a lite guest code', () => {
        const plan = qrLandingPlan(resolution({ targetType: 'GUEST', guestActions: ['UPLOAD', 'WISH'] }), guest);
        expect(plan.choices).toEqual(['upload', 'wish']);
        expect(plan.wishToken).toBe('self');
    });

    it('gives a member Open the event in place of Join', () => {
        expect(qrLandingPlan(resolution({ inviteToken: 'inv', uploadToken: 'up' }), member).choices).toEqual(['open', 'upload']);
    });

    it('gives a member the wishbook when the event has one', () => {
        const plan = qrLandingPlan(resolution({ inviteToken: 'inv', uploadToken: 'up' }), { isMember: true, hasWishbook: true });
        expect(plan.choices).toEqual(['open', 'upload', 'wishbook']);
    });

    it('offers nothing for a closed code', () => {
        expect(qrLandingPlan(resolution({ status: 'REVOKED', inviteToken: 'inv' }), guest).choices).toEqual([]);
        expect(qrLandingPlan(null, guest).choices).toEqual([]);
    });
});

describe('qrLandingStart', () => {
    it('opens the chooser for several choices, the one choice otherwise, and nothing for none', () => {
        expect(qrLandingStart(qrLandingPlan(resolution({ inviteToken: 'inv', uploadToken: 'up' }), guest))).toBe('chooser');
        expect(qrLandingStart(qrLandingPlan(resolution({ targetType: 'MEDIA_UPLOAD' }), guest))).toBe('upload');
        expect(qrLandingStart(qrLandingPlan(null, guest))).toBeNull();
    });
});

describe('qrLandingChoiceHref', () => {
    const plan = qrLandingPlan(resolution({ inviteToken: 'inv', uploadToken: 'up' }), guest);

    it('links join to the invite page, open to the feed and the wishbook to its page', () => {
        expect(qrLandingChoiceHref('join', plan, 'e1')).toBe(routes.inviteToken('inv'));
        expect(qrLandingChoiceHref('open', plan, 'e1')).toBe(routes.events.feed('e1'));
        expect(qrLandingChoiceHref('wishbook', plan, 'e1')).toBe(routes.events.tools.wishbook('e1'));
    });

    it('keeps upload and wish on the page', () => {
        expect(qrLandingChoiceHref('upload', plan, 'e1')).toBeNull();
        expect(qrLandingChoiceHref('wish', plan, 'e1')).toBeNull();
    });
});

describe('resolveQrLandingToken', () => {
    it('stands the scanned token in for self', () => {
        expect(resolveQrLandingToken('self', 'scanned')).toBe('scanned');
        expect(resolveQrLandingToken('up', 'scanned')).toBe('up');
        expect(resolveQrLandingToken(null, 'scanned')).toBeNull();
    });
});
