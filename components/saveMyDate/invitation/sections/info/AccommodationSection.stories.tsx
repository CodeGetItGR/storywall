import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LONG_TEXT, LONG_TITLE, onDark, SectionStory, storySection } from '@/.storybook/invitation';

const section = storySection('accommodation');
const stay = section.data.items[0];
const fullStay = { ...stay, phone: '6900000000', email: 'stay@example.com', mapUrl: 'https://maps.google.com/?q=Rhodes' };
const stays = (count: number) => Array.from({ length: count }, (_, index) => ({ ...fullStay, id: `h${index}`, name: `${stay.name} ${index + 1}` }));

const meta = {
    title: 'SaveMyDate/Info/AccommodationSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneStay: Story = {};

export const FullDetails: Story = {
    args: { section: storySection('accommodation', { subtitle: 'Κοντά στον χώρο της δεξίωσης', items: [fullStay] }) },
};

export const TwoStays: Story = {
    args: { section: storySection('accommodation', { items: stays(2) }) },
};

export const OddStayCount: Story = {
    args: { section: storySection('accommodation', { items: stays(3) }) },
};

export const WithoutWebsite: Story = {
    args: { section: storySection('accommodation', { items: [{ ...fullStay, website: '' }] }) },
};

export const NoStays: Story = {
    args: { section: storySection('accommodation', { items: [] }) },
};

export const LongContent: Story = {
    args: {
        section: storySection('accommodation', {
            title: LONG_TITLE,
            subtitle: LONG_TEXT,
            items: stays(2).map((item) => ({ ...item, name: LONG_TITLE, address: LONG_TEXT })),
        }),
    },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(storySection('accommodation', { items: stays(2), cardStyle: undefined })) },
};
