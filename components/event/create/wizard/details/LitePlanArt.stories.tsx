import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LitePlanArt } from '@/components/event/create/wizard/details/LitePlanArt';

const meta = {
    title: 'CreateEvent/Wizard/LitePlanArt',
    component: LitePlanArt,
    decorators: [
        // 400px like the pop-up on desktop; wide stories use the full page's 632px banner.
        (Story, { parameters }) => (
            <div className="mx-auto bg-white p-4" style={{ maxWidth: parameters.bannerWidth ? parameters.bannerWidth + 32 : 400 }}>
                <Story />
            </div>
        ),
    ],
    args: { title: 'Maria & Nikos', alt: 'Lite plan' },
} satisfies Meta<typeof LitePlanArt>;

export default meta;
type Story = StoryObj<typeof meta>;

// The QR plan: the card guests scan and the gallery.
export const Gallery: Story = { args: { kind: 'gallery' } };

// The Wishbook plan: the printed book and wishes.
export const Wishbook: Story = { args: { kind: 'wishbook' } };

// The Bundle plan: the gallery, the printed book and wishes.
export const Both: Story = { args: { kind: 'both' } };

// The full page on desktop: a wide banner fills its right side with more wishes.
export const WishbookWide: Story = { args: { kind: 'wishbook' }, parameters: { bannerWidth: 632 }, tags: ['visual-desktop-only'] };
export const BothWide: Story = { args: { kind: 'both' }, parameters: { bannerWidth: 632 }, tags: ['visual-desktop-only'] };

// Other event types: their own cover and photos.
export const GalleryBaptism: Story = { args: { kind: 'gallery', title: 'Eleni', eventType: 'BAPTISM' } };
export const BundleBirthday: Story = { args: { kind: 'both', title: 'Nikos 30', eventType: 'BIRTHDAY' } };
