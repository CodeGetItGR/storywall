import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { labelsFor, LONG_NAME, onDark, SectionStory, storySection } from '@/.storybook/invitation';

const section = storySection('parents');

const meta = {
    title: 'SaveMyDate/Family/ParentsSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

// The labels are 14px capitals.
export const Default: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const labels = labelsFor(globals);
        for (const label of [labels.parents, labels.godparents]) {
            const style = getComputedStyle(canvas.getByText(label));
            await expect(style.fontSize).toBe('14px');
            await expect(style.textTransform).toBe('uppercase');
        }
    },
};

export const LongContent: Story = {
    args: { section: storySection('parents', { parents: `${LONG_NAME} & ${LONG_NAME}`, godparents: LONG_NAME }) },
};

export const Empty: Story = {
    args: { section: storySection('parents', { parents: '', godparents: '' }) },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section) },
};
