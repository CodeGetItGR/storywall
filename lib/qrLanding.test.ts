import { describe, expect, it } from 'vitest';

import type { EventInvitationPreviewDto, QrLinkResolutionDto } from '@/lib/api/types';
import { invitationPublicUrl } from '@/lib/invitation/publication';
import {
    qrEventDetails,
    qrJoinAccountHrefs,
    qrLandingChoiceHref,
    type QrLandingPlan,
    qrLandingPlan,
    qrLandingStart,
    resolveQrLandingToken,
    splitQrLandingChoices,
} from '@/lib/qrLanding';
import { routes } from '@/lib/routes';
import { SITE_URL } from '@/lib/seo';

const guest = { isMember: false, hasWishbook: false };
const member = { isMember: true, hasWishbook: false };

function resolution(overrides: Partial<QrLinkResolutionDto>): QrLinkResolutionDto {
    return { status: 'ACTIVE', targetType: 'EVENT_JOIN', eventId: 'e1', ...overrides } as QrLinkResolutionDto;
}

describe('qrLandingPlan', () => {
    it('offers join and upload on a join code whose event takes uploads', () => {
        const plan = qrLandingPlan(resolution({ inviteToken: 'inv', uploadToken: 'up' }), guest);
        expect(plan).toEqual({ choices: ['join', 'upload'], joinInviteToken: 'inv', uploadToken: 'up', wishToken: null, invitationSlug: null });
    });

    it('offers only join on a join code without an upload code', () => {
        expect(qrLandingPlan(resolution({ inviteToken: 'inv' }), guest).choices).toEqual(['join']);
    });

    it('offers join and upload on an old printed upload code, uploading on the scanned code', () => {
        const plan = qrLandingPlan(resolution({ targetType: 'MEDIA_UPLOAD', joinInviteToken: 'inv' }), guest);
        expect(plan).toEqual({ choices: ['join', 'upload'], joinInviteToken: 'inv', uploadToken: 'self', wishToken: null, invitationSlug: null });
    });

    it('offers upload and wish on a lite guest code', () => {
        const plan = qrLandingPlan(resolution({ targetType: 'GUEST', guestActions: ['UPLOAD', 'WISH'] }), guest);
        expect(plan.choices).toEqual(['upload', 'wish']);
        expect(plan.wishToken).toBe('self');
    });

    it('offers a wish on a full plan through the token the backend names', () => {
        const plan = qrLandingPlan(resolution({ inviteToken: 'inv', uploadToken: 'up', guestActions: ['WISH'], wishToken: 'join' }), guest);
        expect(plan).toEqual({ choices: ['join', 'upload', 'wish'], joinInviteToken: 'inv', uploadToken: 'up', wishToken: 'join', invitationSlug: null });
    });

    it('offers a wish on an upload code through the join code', () => {
        const plan = qrLandingPlan(resolution({ targetType: 'MEDIA_UPLOAD', guestActions: ['UPLOAD'], joinInviteToken: 'inv', wishToken: 'join' }), guest);
        expect(plan.choices).toEqual(['join', 'upload', 'wish']);
        expect(plan.wishToken).toBe('join');
    });

    it('gives a member Open the event in place of Join', () => {
        expect(qrLandingPlan(resolution({ inviteToken: 'inv', uploadToken: 'up' }), member).choices).toEqual(['open', 'upload']);
    });

    it('gives a member the wishbook when the event has one', () => {
        const plan = qrLandingPlan(resolution({ inviteToken: 'inv', uploadToken: 'up' }), { isMember: true, hasWishbook: true });
        expect(plan.choices).toEqual(['open', 'upload', 'wishbook']);
    });

    it('offers the invitation after joining when the event has a live one', () => {
        const plan = qrLandingPlan(resolution({ inviteToken: 'inv', uploadToken: 'up', invitationSlug: 'maria-nikos' }), guest);
        expect(plan.choices).toEqual(['join', 'invitation', 'upload']);
        expect(plan.invitationSlug).toBe('maria-nikos');
    });

    it('offers no invitation without a slug', () => {
        expect(qrLandingPlan(resolution({ inviteToken: 'inv', invitationSlug: null }), guest).choices).not.toContain('invitation');
    });

    it('offers the invitation to a member too, after Open', () => {
        expect(qrLandingPlan(resolution({ inviteToken: 'inv', invitationSlug: 'maria-nikos' }), member).choices.slice(0, 2)).toEqual(['open', 'invitation']);
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

    it('opens the published invitation', () => {
        const invitationPlan: QrLandingPlan = { choices: ['invitation'], joinInviteToken: null, uploadToken: null, wishToken: null, invitationSlug: 'maria-nikos' };
        expect(qrLandingChoiceHref('invitation', invitationPlan, 'e1')).toBe(invitationPublicUrl(SITE_URL, 'maria-nikos'));
    });
});

describe('resolveQrLandingToken', () => {
    it('stands the scanned token in for self', () => {
        expect(resolveQrLandingToken('self', 'scanned')).toBe('scanned');
        expect(resolveQrLandingToken('up', 'scanned')).toBe('up');
        expect(resolveQrLandingToken(null, 'scanned')).toBeNull();
    });
});

// KAN-213: the event choice becomes the join card; the rest stay as rows below it.
describe('splitQrLandingChoices', () => {
    it('takes join or open out of the rows', () => {
        expect(splitQrLandingChoices(['join', 'upload', 'wish'])).toEqual({ event: 'join', rest: ['upload', 'wish'] });
        expect(splitQrLandingChoices(['open', 'upload', 'wishbook'])).toEqual({ event: 'open', rest: ['upload', 'wishbook'] });
    });

    it('leaves every choice as a row when there is no event choice', () => {
        expect(splitQrLandingChoices(['upload', 'wish'])).toEqual({ event: null, rest: ['upload', 'wish'] });
    });
});

describe('qrJoinAccountHrefs', () => {
    const plan = { choices: ['join' as const], joinInviteToken: 'inv', uploadToken: null, wishToken: null, invitationSlug: null };

    it('sends sign-up and log-in to the feed with the invite', () => {
        expect(qrJoinAccountHrefs(plan, 'e1')).toEqual({
            register: routes.auth.register({ invite: 'inv', next: routes.events.feed('e1') }),
            login: routes.auth.login({ invite: 'inv', next: routes.events.feed('e1') }),
        });
    });

    it('is null without a join link', () => {
        expect(qrJoinAccountHrefs({ ...plan, joinInviteToken: null }, 'e1')).toBeNull();
    });
});

describe('qrEventDetails', () => {
    const preview = (overrides: Partial<EventInvitationPreviewDto>) =>
        ({ eventStartAt: '2026-11-28T18:30:00+02:00', eventTimezone: 'Europe/Athens', eventLocationName: ' Kifisia ', ...overrides }) as EventInvitationPreviewDto;

    it('puts the date and time on one line, in the event time zone, and trims the place', () => {
        const details = qrEventDetails('en', preview({}));
        expect(details?.when).toContain('2026');
        expect(details?.when).toMatch(/6:30/);
        expect(details?.where).toBe('Kifisia');
    });

    it('is null before the preview loads, or with neither date nor place', () => {
        expect(qrEventDetails('en', null)).toBeNull();
        expect(qrEventDetails('en', preview({ eventStartAt: '', eventLocationName: '  ' }))).toBeNull();
    });
});
