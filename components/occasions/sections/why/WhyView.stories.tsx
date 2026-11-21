import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { translatorFor } from '@/.storybook/copy';
import { withOccasionPage } from '@/.storybook/occasionPage';
import { WhyView } from '@/components/occasions/sections/why/WhyView';
import { whyViewProps } from '@/components/occasions/sections/why/whyViewProps';
import { BAPTISM_PAGE_MEDIA, WEDDING_PAGE_MEDIA } from '@/lib/occasions/pageMedia';

const meta = { title: 'Occasions/WhyView', decorators: [withOccasionPage], parameters: { layout: 'fullscreen' } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// The wedding: photos sliding past, the scan step linking to the QR page.
export const WeddingMarquee: Story = {
    render: (_, { globals }) => (
        <WhyView
            {...whyViewProps({
                imageAlt: translatorFor(globals, 'ImageAlt'),
                layout: 'marquee',
                media: WEDDING_PAGE_MEDIA,
                qrHref: '/el/qr-code-gamou',
                why: translatorFor(globals, 'OccasionPages.WEDDING.why'),
            })}
        />
    ),
    // The marquee moves, so its frame is never the same twice.
    tags: ['visual-skip'],
};

// The baptism: three photos standing still, no QR page link.
export const BaptismRow: Story = {
    render: (_, { globals }) => (
        <WhyView
            {...whyViewProps({
                imageAlt: translatorFor(globals, 'ImageAlt'),
                layout: 'row',
                media: BAPTISM_PAGE_MEDIA,
                qrHref: null,
                why: translatorFor(globals, 'OccasionPages.BAPTISM.why'),
            })}
        />
    ),
};
