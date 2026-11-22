import type { SampleSections } from '@/lib/invitation/eventLinks';
import { createSection, type NewSectionType } from '@/lib/invitation/newSection';
import type { InvitationSection } from '@/lib/invitation/sections';

// One Add section card's picture: the theme's own sample of that type (its look and sample content), else a
// new section. Still: no background effect, no transition art.
export function feedSectionPreview(type: NewSectionType, samples: SampleSections | null, eventType: string): InvitationSection {
    const sample = samples ? [...samples.values()].find((section) => section.type === type) : undefined;
    const section = sample ?? createSection(type, eventType);
    return {
        ...section,
        id: `preview-${type}`,
        visible: true,
        style: { ...section.style, effect: undefined, transition: undefined },
    } as InvitationSection;
}
