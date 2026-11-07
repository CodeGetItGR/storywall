import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { SectionStory, storySection } from '@/.storybook/invitation';

const meta = {
    title: 'SaveMyDate/Top/InvitationSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section: storySection('photoFrame') },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

// The frame itself comes with the frame renderer, so for now this shows only
// the section's saved height and background.
export const PhotoFrame: Story = {};
