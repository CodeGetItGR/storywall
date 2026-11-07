import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LONG_NAME, LONG_TITLE, onDark, SectionStory, storySection } from '@/.storybook/invitation';

const photo = { source: 'media' as const, mediaId: 'm-dad' };
const section = storySection('parentsPhoto');

const meta = {
    title: 'SaveMyDate/Family/ParentsPhotoSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnePhoto: Story = {};

export const BothPhotos: Story = {
    args: {
        section: storySection('parentsPhoto', {
            parentA: { label: 'Μπαμπάς', name: 'Νίκος', photo },
            parentB: { label: 'Μαμά', name: 'Ελένη', photo },
        }),
    },
};

export const WithoutPhotos: Story = {
    args: {
        section: storySection('parentsPhoto', {
            parentA: { label: 'Μπαμπάς', name: 'Νίκος' },
            parentB: { label: 'Μαμά', name: 'Ελένη' },
        }),
    },
};

export const LongContent: Story = {
    args: {
        section: storySection('parentsPhoto', {
            parentsTitle: LONG_TITLE,
            parentA: { label: 'Μπαμπάς', name: LONG_NAME, photo },
            parentB: { label: 'Μαμά', name: LONG_NAME },
        }),
    },
};

export const PhotoWithoutName: Story = {
    args: {
        section: storySection('parentsPhoto', {
            parentA: { label: '', name: '', photo },
            parentB: { label: '', name: '' },
        }, { textStyles: {} }),
    },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section) },
};
