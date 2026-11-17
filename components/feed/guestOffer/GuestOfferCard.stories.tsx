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

// A first visit: the card starts open.
function firstVisit() {
    window.localStorage.removeItem('sw.guestOfferSeen.evt-story');
    window.sessionStorage.removeItem('sw.guestOfferOpen.evt-story');
}

export const Claim: Story = {
    beforeEach({ msw }) {
        msw.use(...offerHandlers({ discountPercent: 20, code: null, endsAt: null }));
        firstVisit();
    },
};

export const CodeClaimed: Story = {
    beforeEach({ msw }) {
        msw.use(...offerHandlers({ discountPercent: 20, code: 'GS-7KQ4M2XR9P', endsAt: '2027-05-31T21:00:00Z' }));
        firstVisit();
    },
};

// A later visit: the card starts folded into the strip.
function seenBefore() {
    window.localStorage.setItem('sw.guestOfferSeen.evt-story', '1');
    window.sessionStorage.removeItem('sw.guestOfferOpen.evt-story');
    return () => window.localStorage.removeItem('sw.guestOfferSeen.evt-story');
}

export const Strip: Story = {
    beforeEach({ msw }) {
        msw.use(...offerHandlers({ discountPercent: 20, code: null, endsAt: null }));
        return seenBefore();
    },
};

export const StripWithCode: Story = {
    beforeEach({ msw }) {
        msw.use(...offerHandlers({ discountPercent: 20, code: 'GS-7KQ4M2XR9P', endsAt: '2027-05-31T21:00:00Z' }));
        return seenBefore();
    },
};
