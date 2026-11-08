import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';

import { ALL_CONTACT_LINKS, LONG_NAME, LONG_TITLE, NO_CONTACT_LINKS, onDark, SectionStory, storySection } from '@/.storybook/invitation';

const section = storySection('coupleContact');
const allLinks = storySection('coupleContact', {
    partnerA: { name: 'Μαρία', ...ALL_CONTACT_LINKS },
    partnerB: { name: 'Γιάννης', ...ALL_CONTACT_LINKS },
});

const meta = {
    title: 'SaveMyDate/Info/CoupleContactSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

// Each name is 24px.
export const Default: Story = {
    play: async ({ canvasElement }) => {
        const sizes = Array.from(canvasElement.querySelectorAll<HTMLElement>('.couple-contact-name'), (el) => getComputedStyle(el).fontSize);
        await expect(sizes).toEqual(['24px', '24px']);
    },
};

export const AllLinks: Story = {
    args: { section: allLinks },
};

export const NoLinks: Story = {
    args: {
        section: storySection('coupleContact', {
            partnerA: { name: 'Μαρία', ...NO_CONTACT_LINKS },
            partnerB: { name: 'Γιάννης', ...NO_CONTACT_LINKS },
        }),
    },
};

export const LongContent: Story = {
    args: {
        section: storySection('coupleContact', {
            title: LONG_TITLE,
            partnerA: { ...ALL_CONTACT_LINKS, name: LONG_NAME },
            partnerB: { ...ALL_CONTACT_LINKS, name: LONG_NAME },
        }),
    },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(allLinks) },
};
