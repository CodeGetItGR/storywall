import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';

import { EVERY_SECTION_DOCUMENT, hiddenDate, onDark, STORY_THEME, storyDocument, storyInvitationMedia, storySection } from '@/.storybook/invitation';
import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import { SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

const shown = [storySection('top'), storySection('invitation'), storySection('coupleNames'), storySection('footer')];
const hidden: InvitationSection = { ...storySection('faq'), visible: false };

const meta = {
    title: 'SaveMyDate/InvitationRenderer',
    component: InvitationRenderer,
    parameters: { layout: 'fullscreen' },
    args: { document: EVERY_SECTION_DOCUMENT, theme: STORY_THEME, media: storyInvitationMedia },
} satisfies Meta<typeof InvitationRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

// The whole invitation, to scroll through. The visual check captures it one
// section at a time instead (InvitationRenderer Sections).
export const EverySection: Story = {
    tags: ['visual-skip'],
};

export const SampleTheme: Story = {
    tags: ['visual-skip'],
    args: { theme: SAMPLE_THEME },
};

export const EnglishLabels: Story = {
    args: { document: storyDocument([hiddenDate('en'), ...shown, storySection('parents'), storySection('countdown')]) },
};

export const HiddenSectionsStayOut: Story = {
    args: { document: storyDocument([shown[0], hidden, shown[1], shown[2], shown[3]]) },
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(`[data-section-id="${hidden.id}"]`)).toBeNull();
        await expect(canvasElement.querySelectorAll('[data-section-id]')).toHaveLength(shown.length);
    },
};

export const HostFonts: Story = {
    args: {
        document: storyDocument(shown, { typographyPresetId: 'story-preset' }),
        hostPreset: { titleFont: 'Georgia,serif', bodyFont: 'Arial,sans-serif' },
    },
};

export const DarkAndLightSections: Story = {
    args: { document: storyDocument([onDark(shown[1]), shown[2], onDark(storySection('parents')), shown[3]]) },
};

export const NoSections: Story = {
    args: { document: storyDocument([]) },
};
