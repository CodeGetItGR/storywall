import { describe, expect, it } from 'vitest';

import { manageSections, parseManageSection } from '@/lib/manageSections';

describe('manageSections', () => {
    it('lists sections in the host dashboard nav order', () => {
        expect(manageSections).toEqual(['overview', 'settings', 'rsvp', 'members', 'billing', 'help', 'danger']);
    });

    it('parseManageSection resolves "help"', () => {
        expect(parseManageSection('help')).toBe('help');
    });

    it('parseManageSection falls back to "overview" for an unknown or removed section', () => {
        expect(parseManageSection('invitations')).toBe('overview');
        expect(parseManageSection('not-a-section')).toBe('overview');
    });
});
