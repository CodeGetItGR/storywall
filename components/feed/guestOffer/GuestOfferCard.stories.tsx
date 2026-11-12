import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';

import { withAppContext } from '@/.storybook/appContext';
import { GuestOfferCard } from '@/components/feed/guestOffer/GuestOfferCard';
import type { GuestOfferDto } from '@/lib/api/types';

// The live-campaign state is left out: its countdown runs on the real clock, so its picture would
// change from one run to the next.

function offerHandlers(offer: GuestOfferDto) {
    return [
        http.get('*/api/discount-campaign', () => HttpResponse.json(null)),
        http.get('*/api/events/:eventId/guest-offer', () => HttpResponse.json(offer)),
        http.post('*/api/events/:eventId/guest-offer/activity', () => new HttpResponse(null, { status: 204 })),
    ];
}

const meta = {
    title: 'Feed/GuestOfferCard',
    component: GuestOfferCard,
    args: { eventId: 'evt-story', isHost: false },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="mx-auto max-w-2xl">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof GuestOfferCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Claim: Story = {
    beforeEach({ msw }) {
        msw.use(...offerHandlers({ discountPercent: 20, code: null, endsAt: null }));
    },
};

export const CodeClaimed: Story = {
    beforeEach({ msw }) {
        msw.use(...offerHandlers({ discountPercent: 20, code: 'GS-7KQ4M2XR9P', endsAt: '2027-05-31T21:00:00Z' }));
    },
};
