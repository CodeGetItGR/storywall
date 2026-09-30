import { describe, expect, it } from 'vitest';

import { manageSections, parseManageSection, resolveManageSection, visibleManageSections } from '@/lib/manageSections';

describe('manageSections', () => {
    it('lists sections in the host dashboard nav order', () => {
        expect(manageSections).toEqual(['overview', 'settings', 'rsvp', 'members', 'gift', 'billing', 'help', 'danger']);
    });

    it('parseManageSection resolves "help"', () => {
        expect(parseManageSection('help')).toBe('help');
    });

    it('parseManageSection falls back to "overview" for an unknown or removed section', () => {
        expect(parseManageSection('invitations')).toBe('overview');
        expect(parseManageSection('not-a-section')).toBe('overview');
    });

    it('visibleManageSections hides RSVP when the plan does not include it', () => {
        expect(visibleManageSections({ canDelete: true, rsvpAvailable: false })).toEqual([
            'overview',
            'settings',
            'members',
            'billing',
            'help',
            'danger',
        ]);
    });

    it('visibleManageSections hides Danger for co-hosts', () => {
        expect(visibleManageSections({ canDelete: false, rsvpAvailable: true })).toEqual([
            'overview',
            'settings',
            'rsvp',
            'members',
            'billing',
            'help',
        ]);
    });

    it('visibleManageSections shows the gift section only when it is available', () => {
        expect(visibleManageSections({ canDelete: false, rsvpAvailable: false, giftAvailable: true })).toEqual([
            'overview',
            'settings',
            'members',
            'gift',
            'billing',
            'help',
        ]);
    });

    it('resolveManageSection keeps a section that is still loading and drops a hidden one', () => {
        const visibleSections = visibleManageSections({ canDelete: true, rsvpAvailable: true });
        expect(resolveManageSection('gift', { isDraft: false, visibleSections, pendingSections: ['gift'] })).toBe('gift');
        expect(resolveManageSection('gift', { isDraft: false, visibleSections })).toBe('overview');
        expect(resolveManageSection('members', { isDraft: true, visibleSections })).toBe('overview');
    });
});
