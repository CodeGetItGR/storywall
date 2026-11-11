import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { CheckoutCelebration } from '@/components/checkout/CheckoutCelebration';

const meta = {
    title: 'Checkout/CheckoutCelebration',
    component: CheckoutCelebration,
    parameters: { layout: 'fullscreen' },
    args: {
        card: { photoSrc: '/landing/03-wedding-ceremony-santorini.webp', alt: 'Wedding', title: 'Maria & Nikos', date: 'Sat, 12 June 2027' },
        feedHref: '/events/evt-story/feed',
        inviteHref: '/events/evt-story/manage/qr',
    },
} satisfies Meta<typeof CheckoutCelebration>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongTitle: Story = {
    args: {
        card: {
            photoSrc: '/landing/03-wedding-ceremony-santorini.webp',
            alt: 'Wedding',
            title: 'Alexandra & Konstantinos Papadopoulos',
            date: 'Sat, 12 June 2027',
        },
    },
};
