import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LONG_NAME, LONG_TITLE, onDark, SectionStory, storyPeople, storySection } from '@/.storybook/invitation';

const godparents = storySection('godparents');
const noStyles = { textStyles: {} };

const meta = {
    title: 'SaveMyDate/Family/PhotoPeopleSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section: godparents },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Godparents: Story = {};

export const OnePerson: Story = {
    args: { section: storySection('godparents', { godparents: storyPeople(1) }, noStyles) },
};

export const OddPeopleCount: Story = {
    args: { section: storySection('godparents', { godparents: storyPeople(3) }, noStyles) },
};

export const EvenPeopleCount: Story = {
    args: { section: storySection('godparents', { godparents: storyPeople(4) }, noStyles) },
};

export const WithoutPhotos: Story = {
    args: { section: storySection('godparents', { godparents: storyPeople(3, false) }, noStyles) },
};

export const NoPeople: Story = {
    args: { section: storySection('godparents', { godparents: [] }, noStyles) },
};

export const LongContent: Story = {
    args: {
        section: storySection('godparents', {
            godparentsTitle: LONG_TITLE,
            godparents: storyPeople(2).map((person) => ({ ...person, name: LONG_NAME })),
        }, noStyles),
    },
};

export const WeddingSponsors: Story = {
    args: { section: storySection('weddingSponsors') },
};

export const WeddingSponsorsWithPhotos: Story = {
    args: { section: storySection('weddingSponsors', { sponsors: storyPeople(3) }) },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(godparents) },
};
