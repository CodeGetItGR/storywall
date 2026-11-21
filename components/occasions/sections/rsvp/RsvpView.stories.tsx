import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { translatorFor } from '@/.storybook/copy';
import { withOccasionPage } from '@/.storybook/occasionPage';
import { RsvpView } from '@/components/occasions/sections/rsvp/RsvpView';
import { rsvpViewProps } from '@/components/occasions/sections/rsvp/rsvpViewProps';
import { BAPTISM_PAGE_MEDIA, WEDDING_PAGE_MEDIA } from '@/lib/occasions/pageMedia';

const meta = { title: 'Occasions/RsvpView', decorators: [withOccasionPage], parameters: { layout: 'fullscreen' } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Wedding: Story = {
    render: (_, { globals }) => (
        <RsvpView
            {...rsvpViewProps(translatorFor(globals, 'OccasionPages.WEDDING.rsvp'), WEDDING_PAGE_MEDIA.rsvpPictures[globals.locale === 'el' ? 'el' : 'en'])}
        />
    ),
};

export const Baptism: Story = {
    render: (_, { globals }) => (
        <RsvpView
            {...rsvpViewProps(translatorFor(globals, 'OccasionPages.BAPTISM.rsvp'), BAPTISM_PAGE_MEDIA.rsvpPictures[globals.locale === 'el' ? 'el' : 'en'])}
        />
    ),
};
