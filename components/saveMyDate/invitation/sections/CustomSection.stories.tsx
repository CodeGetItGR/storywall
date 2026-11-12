import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { LONG_TEXT, LONG_TITLE, onDark, SectionStory, storySection } from '@/.storybook/invitation';

const section = storySection('blank');

const meta = {
    title: 'SaveMyDate/Top/CustomSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoColumns: Story = {};

export const Stacked: Story = {
    args: {
        section: storySection('blank', {}, {
            elements: section.elements.filter((element) => element.kind !== 'columnBreak'),
        }),
    },
};

export const LongContent: Story = {
    args: {
        section: storySection('blank', {}, {
            elements: [
                { id: 'long-title', kind: 'text', role: 'title', text: LONG_TITLE, style: { size: 32 }, fullWidth: true },
                { id: 'long-left', kind: 'text', role: 'paragraph', text: LONG_TEXT, style: {} },
                { id: 'long-break', kind: 'columnBreak' },
                { id: 'long-right', kind: 'text', role: 'paragraph', text: LONG_TEXT, style: {} },
            ],
        }),
    },
};

export const Empty: Story = {
    args: { section: storySection('blank', {}, { elements: [] }) },
};

export const LinkWithoutText: Story = {
    args: {
        section: storySection('blank', {}, {
            elements: [{ id: 'bare-link', kind: 'link', text: '', url: 'https://example.com' }],
        }),
    },
    play: async ({ canvasElement, globals }) => {
        await expect(within(canvasElement).getByRole('link', { name: copyFor(globals).InvitationRenderer.linkFallback })).toBeVisible();
    },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section) },
};

export const BaseTextOnDarkBackground: Story = {
    args: { section: onDark(storySection('blank', {}, { style: { ...section.style, textContrast: 'base' } })) },
};
