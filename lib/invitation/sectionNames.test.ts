import { describe, expect, it } from 'vitest';

import { sectionNameKey } from '@/lib/invitation/sectionNames';

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
});
