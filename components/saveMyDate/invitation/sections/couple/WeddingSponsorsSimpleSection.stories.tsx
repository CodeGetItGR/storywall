import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LONG_NAME, LONG_TITLE, onDark, SectionStory, STORY_DECORATION, storySection } from '@/.storybook/invitation';

const section = storySection('weddingSponsorsSimple');

const meta = {
    title: 'SaveMyDate/Couple/WeddingSponsorsSimpleSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDecoration: Story = {
    args: { section: storySection('weddingSponsorsSimple', { decoration: STORY_DECORATION }) },
};

export const OddNameCount: Story = {
    args: { section: storySection('weddingSponsorsSimple', { sponsorsNames: 'Κώστας\nΔήμητρα\nΝίκος' }) },
};

export const LongContent: Story = {
    args: { section: storySection('weddingSponsorsSimple', { sponsorsTitle: LONG_TITLE, sponsorsNames: `${LONG_NAME}\n${LONG_NAME}` }) },
};

export const Empty: Story = {
    args: { section: storySection('weddingSponsorsSimple', { sponsorsTitle: '', sponsorsNames: '' }) },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section) },
};
