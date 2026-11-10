import { describe, expect, it } from 'vitest';

import { inviteHostRoute, isInvitationSlug, isInviteHost, mainSiteUrl, publishedInvitationPath } from '@/lib/invitation/inviteHost';

describe('isInvitationSlug', () => {
    it('takes the links the backend gives out', () => {
        expect(isInvitationSlug('maria-and-nikos-2026')).toBe(true);
        expect(isInvitationSlug('abc')).toBe(true);
        expect(isInvitationSlug('a'.repeat(60))).toBe(true);
    });

    it('turns down anything the backend would never give out', () => {
        for (const value of ['ab', 'a'.repeat(61), 'Maria', 'maria--nikos', '-maria', 'maria-', 'μαρία', 'maria_nikos', 'a b']) {
            expect(isInvitationSlug(value)).toBe(false);
        }
    });
});

describe('isInviteHost', () => {
    it('knows the production, staging and local invite hosts', () => {
        expect(isInviteHost('invite.storywall.gr')).toBe(true);
        expect(isInviteHost('invite.staging.storywall.gr')).toBe(true);
        expect(isInviteHost('INVITE.localhost')).toBe(true);
        expect(isInviteHost('invite.localhost:3211')).toBe(true);
    });

    it('leaves every other host alone', () => {
        for (const host of ['www.storywall.gr', 'staging.storywall.gr', 'localhost', 'invites.storywall.gr', 'my-invite.storywall.gr']) {
            expect(isInviteHost(host)).toBe(false);
        }
    });
});

describe('inviteHostRoute', () => {
    it('draws a link as the invitation page', () => {
        expect(inviteHostRoute('/maria-and-nikos')).toEqual({ kind: 'invitation', path: publishedInvitationPath('maria-and-nikos') });
        expect(publishedInvitationPath('maria-and-nikos')).toBe('/save-my-date/i/maria-and-nikos');
    });

    it('serves files', () => {
        expect(inviteHostRoute('/robots.txt')).toEqual({ kind: 'file' });
        expect(inviteHostRoute('/save-my-date/calendar-icons/apple.png')).toEqual({ kind: 'file' });
    });

    it('sends everything else to the main site', () => {
        for (const path of ['/', '/events/e1', '/Maria', '/ab', '/save-my-date/i/maria-and-nikos']) {
            expect(inviteHostRoute(path)).toEqual({ kind: 'main-site' });
        }
    });
});

describe('mainSiteUrl', () => {
    it('goes straight to the production origin from the production invite host', () => {
        expect(mainSiteUrl(new URL('https://invite.storywall.gr/pricing?a=1'), 'https://www.storywall.gr').href).toBe(
            'https://www.storywall.gr/pricing?a=1',
        );
    });

    it('drops the invite label on staging and locally', () => {
        expect(mainSiteUrl(new URL('https://invite.staging.storywall.gr/'), 'https://www.storywall.gr').href).toBe('https://staging.storywall.gr/');
        expect(mainSiteUrl(new URL('http://invite.localhost:3200/x'), 'https://www.storywall.gr').href).toBe('http://localhost:3200/x');
    });
});
