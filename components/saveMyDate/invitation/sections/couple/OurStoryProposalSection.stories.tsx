import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LONG_TEXT, LONG_TITLE, onDark, SectionStory, storySection } from '@/.storybook/invitation';

const section = storySection('ourStoryProposal');

const meta = {
    title: 'SaveMyDate/Couple/OurStoryProposalSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongContent: Story = {
    args: {
        section: storySection('ourStoryProposal', {
            block1Title: LONG_TITLE,
            block1Body: LONG_TEXT,
            block2Title: LONG_TITLE,
            block2Body: LONG_TEXT,
        }),
    },
};

export const Empty: Story = {
    args: {
        section: storySection('ourStoryProposal', {
            block1Title: '',
            block1Subtitle: '',
            block1Body: '',
            block2Title: '',
            block2Subtitle: '',
            block2Body: '',
        }),
    },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(storySection('ourStoryProposal', { block1Body: LONG_TEXT, block2Body: LONG_TEXT })) },
};
