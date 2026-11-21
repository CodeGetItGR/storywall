import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { translatorFor } from '@/.storybook/copy';
import { withOccasionPage } from '@/.storybook/occasionPage';
import { WhyPhotoRow } from '@/components/occasions/sections/why/WhyPhotoRow';
import { whyViewProps } from '@/components/occasions/sections/why/whyViewProps';
import { BAPTISM_PAGE_MEDIA } from '@/lib/occasions/pageMedia';

const meta = { title: 'Occasions/WhyPhotoRow', decorators: [withOccasionPage], parameters: { layout: 'fullscreen' } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// The baptism's three guest photos, built the way the server builds them.
export const Default: Story = {
    render: (_, { globals }) => (
        <WhyPhotoRow
            tiles={
                whyViewProps({
                    imageAlt: translatorFor(globals, 'ImageAlt'),
                    layout: 'row',
                    media: BAPTISM_PAGE_MEDIA,
                    qrHref: null,
                    why: translatorFor(globals, 'OccasionPages.BAPTISM.why'),
                }).with.guestPhotos.tiles
            }
        />
    ),
};
