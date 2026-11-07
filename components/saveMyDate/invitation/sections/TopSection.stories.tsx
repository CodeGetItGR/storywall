import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { LONG_TITLE, onDark, previewSection, SectionStory, STORY_THEME,storySection } from '@/.storybook/invitation';

const elements = previewSection('top').elements;
const section = storySection('top', {}, { elements });
const themeWithoutArt = { ...STORY_THEME, art: {} };

const meta = {
    title: 'SaveMyDate/Top/TopSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, globals }) => {
        const art = within(canvasElement).getByRole('img', { name: copyFor(globals).InvitationRenderer.mainArtAlt });
        await expect(art).toBeVisible();
    },
};

export const WithoutArt: Story = {
    args: { theme: themeWithoutArt },
};

export const LongContent: Story = {
    args: {
        section: storySection('top', {}, {
            elements: [{ id: 'top-long', kind: 'text', role: 'title', text: LONG_TITLE, style: { size: 44 } }],
        }),
    },
};

export const Empty: Story = {
    args: { section: storySection('top', {}, { elements: [] }), theme: themeWithoutArt },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section), theme: themeWithoutArt },
};

export const LightTextOnPhoto: Story = {
    args: { section: storySection('top', {}, { elements, style: { ...section.style, textContrast: 'light' } }) },
};
