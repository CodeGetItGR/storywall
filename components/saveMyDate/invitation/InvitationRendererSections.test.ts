import { describe, expect, it, vi } from 'vitest';

import { shownSectionIds } from '@/.storybook/invitation';
import * as previewEnglish from '@/app/(saveMyDate)/save-my-date/preview/PreviewPageEnglishCalendarDate.stories';
import * as previewGreek from '@/app/(saveMyDate)/save-my-date/preview/PreviewPageGreek.stories';
import * as everySection from '@/components/saveMyDate/invitation/InvitationRendererEverySection.stories';
import * as sampleTheme from '@/components/saveMyDate/invitation/InvitationRendererSampleTheme.stories';
import type { InvitationDocument } from '@/lib/invitation/document';

vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

type StoryModule = { default: { args: { document: InvitationDocument } } } & Record<string, unknown>;

// The section each story shows, in the order the stories are written.
function shownByStories(module: StoryModule) {
    return Object.entries(module)
        .filter(([name]) => name !== 'default')
        .map(([, story]) => shownSectionIds((story as { args: { document: InvitationDocument } }).args.document));
}

describe.each([
    ['Every Section', everySection],
    ['Sample Theme', sampleTheme],
    ['Preview Greek', previewGreek],
    ['Preview English Calendar Date', previewEnglish],
])('%s section stories', (_, module) => {
    const stories = shownByStories(module as StoryModule);

    it('shows one section per story', () => {
        for (const shown of stories) expect(shown).toHaveLength(1);
    });

    it('covers every section of the full invitation once', () => {
        const full = shownSectionIds((module as StoryModule).default.args.document);
        expect(stories.flat().toSorted()).toEqual(full.toSorted());
    });
});
