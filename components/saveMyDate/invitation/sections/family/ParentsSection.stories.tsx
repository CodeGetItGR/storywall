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

// The labels keep the browser's own small size (13.33px under 16px text), as on the old page.
export const Default: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const labels = labelsFor(globals);
        for (const label of [labels.parents, labels.godparents]) {
            await expect(parseFloat(getComputedStyle(canvas.getByText(label)).fontSize)).toBeCloseTo(13.33, 1);
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
