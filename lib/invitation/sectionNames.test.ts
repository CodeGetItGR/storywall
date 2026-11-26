import { describe, expect, it } from 'vitest';

import { hasSectionName, sectionName, sectionNameKey } from '@/lib/invitation/sectionNames';
import { SECTION_TYPES } from '@/lib/invitation/sections';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

describe('sectionNameKey', () => {
    it('names the schedule by event type', () => {
        expect(sectionNameKey('program', 'WEDDING')).toBe('sectionNames.programWedding');
        expect(sectionNameKey('program', 'BAPTISM')).toBe('sectionNames.programBaptism');
        expect(sectionNameKey('program', 'BIRTHDAY')).toBe('sectionNames.program');
        expect(sectionNameKey('program', undefined)).toBe('sectionNames.program');
    });

    it('leaves every other section as it is', () => {
        expect(sectionNameKey('faq', 'WEDDING')).toBe('sectionNames.faq');
    });

    it('has a name in both languages for every type it takes', () => {
        for (const type of SECTION_TYPES.filter(hasSectionName)) {
            const key = sectionNameKey(type, undefined).replace('sectionNames.', '');
            expect(en.InvitationEditor.sectionNames, key).toHaveProperty(key);
            expect(el.InvitationEditor.sectionNames, key).toHaveProperty(key);
        }
    });

    it('never reads a name for Boy or Girl or a module block, named after their module', () => {
        expect(hasSectionName('feedHeOrShe')).toBe(false);
        expect(hasSectionName('feedModule')).toBe(false);
        expect(sectionName((key) => key, 'feedHeOrShe', 'BAPTISM')).toBe('');
        expect(sectionName((key) => key, 'program', 'BAPTISM')).toBe('sectionNames.programBaptism');
    });
});
