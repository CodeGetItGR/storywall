import { describe, expect, it } from 'vitest';

import { sectionToolsPadding } from '@/lib/feedToolsRoom';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection, SectionType } from '@/lib/invitation/sections';

const padding = (type: SectionType, paddingY?: number) => sectionToolsPadding({ type, style: { ...SAMPLE_SECTIONS.date.style, paddingY } } as InvitationSection);

describe('sectionToolsPadding', () => {
    it('makes room for the tools', () => {
        expect(padding('date')).toBe('72px');
        expect(padding('photo', 10)).toBe('72px');
    });

    it('keeps a larger padding the section is drawn with', () => {
        expect(padding('photoFrame', 100)).toBe('100px');
    });

    it('ignores a saved padding the feed never draws', () => {
        expect(padding('date', 100)).toBe('72px');
    });
});
