import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';

import { withAppContext } from '@/.storybook/appContext';
import { storyEvent, storyHostMember, storyModules, storyQrLink } from '@/.storybook/fixtures';
import { ComposerCard } from '@/components/feed/ComposerCard';
import { FeedQuickActions } from '@/components/feed/quickActions/FeedQuickActions';
import type { VendorMeDto, VendorRowDto } from '@/lib/api/types';
import { useActiveEvent, useIsHost } from '@/providers/EventProvider';

// A live event whose plan has every quick action: its invitation is online and its upload code takes photos.
const fullEvent = storyEvent({
    invitationSlug: 'eleni-nikos',
    uploadToken: 'up-story',
    modules: storyModules(['posts', 'rsvp', 'playlist', 'stories', 'gallery', 'wishlist', 'wishbook', 'schedule', 'vendors']),
});

const vendorRows = [
    { id: 'v1', memberId: 'mem-v1', vendorType: 'PHOTOGRAPHER', businessName: 'Studio Light', link: null, hiddenByHost: false, optedOut: false },
] as unknown as VendorRowDto[];

const planner = {
    vendorId: 'v2',
    vendorType: 'PLANNER',
    capabilities: ['ANNOUNCE', 'QR_READ', 'RSVP_REPORT', 'SCHEDULE_EDIT'],
    accessEndsAt: '2026-08-04T15:00:00Z',
    accessOpen: true,
    profileComplete: true,
    showPartnerPrompt: false,
    proStorageBytes: null,
    proUsedBytes: null,
    optedOut: false,
    hiddenByHost: false,
} as unknown as VendorMeDto;

// The feed's composer with the quick actions under it.
function UnderComposer() {
    const event = useActiveEvent();
    const isHost = useIsHost();
    if (!event) return null;

    return (
        <div className="mx-auto w-full max-w-2xl bg-event pt-4 pb-8">
            <ComposerCard />
            <FeedQuickActions event={event} isHost={isHost} />
        </div>
    );
}

const meta = {
    title: 'Feed/FeedQuickActions',
    component: UnderComposer,
    globals: { viewport: { value: 'mobile' } },
    parameters: { layout: 'fullscreen', app: { event: fullEvent } },
    decorators: [withAppContext],
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/events/:eventId/vendors', () => HttpResponse.json(vendorRows)),
            http.get('*/api/events/:eventId/vendors/me', () => HttpResponse.json({ status: 404 }, { status: 404 })),
        );
    },
} satisfies Meta<typeof UnderComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

// A guest: invitation, photos, wishbook and vendors. Share is the host's.
export const Guest: Story = {};

// The host also gets Share once the invite link exists.
export const Host: Story = {
    parameters: { app: { event: fullEvent, member: storyHostMember } },
    beforeEach({ msw }) {
        msw.use(http.get('*/api/events/:eventId/qr-links', () => HttpResponse.json([storyQrLink()])));
    },
};

// A vendor gets one row: their own tools, a divider, then the guests' quick actions. It scrolls sideways.
export const Vendor: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/events/:eventId/vendors/me', () => HttpResponse.json(planner)));
    },
};

// No invitation online, no upload code and no vendors listed: only the wishbook is left.
export const GuestWishbookOnly: Story = {
    parameters: { app: { event: storyEvent() } },
    beforeEach({ msw }) {
        msw.use(http.get('*/api/events/:eventId/vendors', () => HttpResponse.json([])));
    },
};
