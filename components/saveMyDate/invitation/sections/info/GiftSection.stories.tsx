import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { labelsFor, LONG_TITLE, onDark, SectionStory, storySection } from '@/.storybook/invitation';

const section = storySection('gift');

const meta = {
    title: 'SaveMyDate/Info/GiftSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongContent: Story = {
    args: { section: storySection('gift', { title: LONG_TITLE, bank: LONG_TITLE, iban: 'GR00 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000' }) },
};

export const Empty: Story = {
    args: { section: storySection('gift', { title: '', bank: '', iban: '' }) },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section) },
};

// "Copied" goes back to "Copy" by itself after a moment, so this can't be a stable capture.
export const CopiesIban: Story = {
    tags: ['visual-skip'],
    beforeEach() {
        const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: fn(async () => {}) } });
        return () => {
            if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard);
            else Reflect.deleteProperty(navigator, 'clipboard');
        };
    },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const labels = labelsFor(globals);
        await userEvent.click(canvas.getByRole('button', { name: labels.copy }));
        await expect(await canvas.findByText(labels.copied)).toBeVisible();
        await expect(navigator.clipboard.writeText).toHaveBeenCalledWith(section.data.iban);
    },
};
