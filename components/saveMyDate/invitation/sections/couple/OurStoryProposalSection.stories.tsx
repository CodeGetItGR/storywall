import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

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

const fontSizes = (root: HTMLElement, selector: string) =>
    Array.from(root.querySelectorAll<HTMLElement>(selector), (el) => getComputedStyle(el).fontSize);

// Both titles use the 34px heading size at every width, like the old page. Years are 15px and the text 17px.
export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        for (const name of [section.data.block1Title, section.data.block2Title]) {
            await expect(getComputedStyle(canvas.getByRole('heading', { name })).fontSize).toBe('34px');
        }
        await expect(fontSizes(canvasElement, '.story-block-subtitle')).toEqual(['15px', '15px']);
        await expect(fontSizes(canvasElement, '.story-block-body')).toEqual(['17px', '17px']);
    },
};

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
