import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';

import { withAppContext } from '@/.storybook/appContext';
import { storyEvent, storyHostMember, storyModules } from '@/.storybook/fixtures';
import { desktopOnly } from '@/.storybook/modes';
import { QuickAccessBar } from '@/components/feed/QuickAccessBar';
import type { EventGiftAccountResponseDto } from '@/lib/api/types';

const giftAccount: EventGiftAccountResponseDto = {
    id: 'gift-1',
    eventId: 'evt-story',
    iban: 'GR1601101250000000012300695',
    accountHolder: 'Eleni Georgiou',
    bankName: 'Alpha Bank',
    note: null,
    updatedAt: '2026-05-01T09:00:00Z',
};

// Desktop only: the bar is hidden below the lg breakpoint.
const meta = {
    title: 'Feed/QuickAccessBar',
    component: QuickAccessBar,
    parameters: { ...desktopOnly },
    globals: { viewport: { value: 'desktop' } },
    decorators: [withAppContext],
    beforeEach({ msw }) {
        msw.use(http.get('*/api/events/:eventId/gift-account', () => HttpResponse.json(giftAccount)));
    },
} satisfies Meta<typeof QuickAccessBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Guest: Story = {};

// Hosts also see the gallery.
export const Host: Story = {
    parameters: { app: { member: storyHostMember } },
};

// Without a gift account, guests don't see the gifts link.
export const GuestWithoutGiftAccount: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/events/:eventId/gift-account', () => HttpResponse.json({ status: 404, errorCode: 'NOT_FOUND' }, { status: 404 })));
    },
};

export const GenderReveal: Story = {
    parameters: {
        app: { event: storyEvent({ eventType: 'GENDER_REVEAL', modules: storyModules(['posts', 'stories', 'playlist', 'wishbook', 'he_or_she']) }) },
    },
};
