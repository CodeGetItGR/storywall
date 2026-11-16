import { describe, expect, it } from 'vitest';

import {
    isManagePage,
    manageNavGroups,
    manageNavHref,
    manageSections,
    parseManageSection,
    resolveManageSection,
    visibleManageNav,
    visibleManageSections,
} from '@/lib/manageSections';
import { routes } from '@/lib/routes';

describe('manageSections', () => {
    it('lists sections in the nav order: the Event group, then People, then Danger zone', () => {
        expect(manageSections).toEqual(['overview', 'settings', 'theme', 'billing', 'gift', 'rsvp', 'members', 'danger']);
        const groupedSections = manageNavGroups.flatMap((group) => group.items).filter((key) => !isManagePage(key));
        expect([...groupedSections, 'danger']).toEqual(manageSections);
    });

    it('groups the nav under Event and People, with the two pages among the People', () => {
        expect(manageNavGroups).toEqual([
            { key: 'event', items: ['overview', 'settings', 'theme', 'billing', 'gift'] },
            { key: 'people', items: ['rsvp', 'invitationsQr', 'members', 'vendors'] },
        ]);
    });

    it('manageNavHref opens a section through ?tab= and a page on its own route', () => {
        expect(manageNavHref('e1', 'overview')).toBe(routes.events.manage('e1'));
        expect(manageNavHref('e1', 'settings')).toBe(routes.events.manage('e1', { tab: 'settings' }));
        expect(manageNavHref('e1', 'invitationsQr')).toBe(routes.events.invitationsQr('e1'));
        expect(manageNavHref('e1', 'vendors')).toBe(routes.events.manageVendors('e1'));
    });

    it('visibleManageNav keeps only visible entries, drops empty groups and keeps Danger zone apart', () => {
        const visibleSections = visibleManageSections({ canDelete: true, rsvpAvailable: false, membersAvailable: false });
        expect(visibleManageNav(visibleSections, { invitationsQr: false, vendors: false })).toEqual({
            groups: [{ key: 'event', items: ['overview', 'settings', 'billing'] }],
            showDanger: true,
        });
        expect(visibleManageNav(visibleManageSections({ canDelete: false, rsvpAvailable: true }), { invitationsQr: true, vendors: true })).toEqual({
            groups: [
                { key: 'event', items: ['overview', 'settings', 'billing'] },
                { key: 'people', items: ['rsvp', 'invitationsQr', 'members', 'vendors'] },
            ],
            showDanger: false,
        });
    });

    it('no longer accepts the old invitation tab', () => {
        expect(parseManageSection('invitation')).toBe('overview');
    });

    it('parseManageSection sends the removed Help section to the overview', () => {
        expect(parseManageSection('help')).toBe('overview');
    });

    it('parseManageSection falls back to "overview" for an unknown or removed section', () => {
        expect(parseManageSection('invitations')).toBe('overview');
        expect(parseManageSection('not-a-section')).toBe('overview');
    });

    it('visibleManageSections hides RSVP when the plan does not include it', () => {
        expect(visibleManageSections({ canDelete: true, rsvpAvailable: false })).toEqual([
            'overview',
            'settings',
            'billing',
            'members',
            'danger',
        ]);
    });

    it('visibleManageSections hides Danger for co-hosts', () => {
        expect(visibleManageSections({ canDelete: false, rsvpAvailable: true })).toEqual([
            'overview',
            'settings',
            'billing',
            'rsvp',
            'members',
        ]);
    });

    it('visibleManageSections shows the gift section only when it is available', () => {
        expect(visibleManageSections({ canDelete: false, rsvpAvailable: false, giftAvailable: true })).toEqual([
            'overview',
            'settings',
            'billing',
            'gift',
            'members',
        ]);
    });

    it('visibleManageSections shows the theme section only when the event can pick a theme', () => {
        expect(visibleManageSections({ canDelete: false, rsvpAvailable: false })).not.toContain('theme');
        expect(visibleManageSections({ canDelete: false, rsvpAvailable: false, themeAvailable: true })).toEqual([
            'overview',
            'settings',
            'theme',
            'billing',
            'members',
        ]);
    });

    it('visibleManageSections hides Members on an event that takes no guests', () => {
        expect(visibleManageSections({ canDelete: true, rsvpAvailable: true })).toContain('members');
        expect(visibleManageSections({ canDelete: true, rsvpAvailable: false, membersAvailable: false })).toEqual([
            'overview',
            'settings',
            'billing',
            'danger',
        ]);
    });

    it('resolveManageSection sends a hidden Members tab back to the overview', () => {
        const visibleSections = visibleManageSections({ canDelete: true, rsvpAvailable: false, membersAvailable: false });
        expect(resolveManageSection('members', { isDraft: false, visibleSections })).toBe('overview');
    });

    it('resolveManageSection keeps a section that is still loading and drops a hidden one', () => {
        const visibleSections = visibleManageSections({ canDelete: true, rsvpAvailable: true });
        expect(resolveManageSection('gift', { isDraft: false, visibleSections, pendingSections: ['gift'] })).toBe('gift');
        expect(resolveManageSection('gift', { isDraft: false, visibleSections })).toBe('overview');
        expect(resolveManageSection('members', { isDraft: true, visibleSections })).toBe('overview');
    });
});
