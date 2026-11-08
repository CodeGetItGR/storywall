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

// The IBAN shrinks only as far as it must to fit on one line, also with reduced motion on.
export const LongContent: Story = {
    args: { section: storySection('gift', { title: LONG_TITLE, bank: LONG_TITLE, iban: 'GR00 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000' }) },
    play: async ({ canvasElement }) => {
        const box = canvasElement.querySelector<HTMLElement>('.iban');
        const text = box?.querySelector<HTMLElement>('.text-block');
        if (!box || !text) throw new Error('The IBAN is missing');
        await expect(text.scrollWidth).toBeLessThanOrEqual(box.clientWidth);
        // Half a pixel bigger would not fit, so it did not shrink further than it had to.
        const size = parseFloat(getComputedStyle(text).fontSize);
        text.style.transition = 'none';
        text.style.fontSize = `${size + 0.5}px`;
        const tooWide = text.scrollWidth > box.clientWidth;
        text.style.fontSize = `${size}px`;
        text.style.transition = '';
        await expect(tooWide).toBe(true);
    },
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
