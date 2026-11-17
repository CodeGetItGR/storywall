import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ALL_CONTACT_LINKS, LONG_TITLE, NO_CONTACT_LINKS, onDark, SectionStory, storySection } from '@/.storybook/invitation';

const section = storySection('contact');

const meta = {
    title: 'SaveMyDate/Info/ContactSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneLink: Story = {};

export const AllLinks: Story = {
    args: { section: storySection('contact', ALL_CONTACT_LINKS) },
};

export const OddLinkCount: Story = {
    args: { section: storySection('contact', { ...NO_CONTACT_LINKS, phone: ALL_CONTACT_LINKS.phone, email: ALL_CONTACT_LINKS.email, instagram: ALL_CONTACT_LINKS.instagram }) },
};

export const NoLinks: Story = {
    args: { section: storySection('contact', NO_CONTACT_LINKS) },
};

export const LongContent: Story = {
    args: { section: storySection('contact', { ...ALL_CONTACT_LINKS, title: LONG_TITLE }) },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(storySection('contact', { ...ALL_CONTACT_LINKS, iconStyle: undefined })) },
};
