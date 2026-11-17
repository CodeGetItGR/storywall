import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { expect, within } from 'storybook/test';

import { withAdminShell } from '@/.storybook/admin';
import { copyFor } from '@/.storybook/copy';
import { emptyActivityFixture, festivalActivityFixture, weddingActivityFixture } from '@/components/admin/events/activity/__fixtures__/eventActivity';
import { EventActivityTab } from '@/components/admin/events/activity/EventActivityTab';
import type { AdminEventActivityDto } from '@/lib/api/types';

const ACTIVITY_URL = '*/api/admin/events/:eventId/activity';

// The preview's fixed clock stamps the response, so "Updated" always reads the same time.
const respondWith = (activity: AdminEventActivityDto) => http.get(ACTIVITY_URL, () => HttpResponse.json(activity));

const meta = {
    title: 'Admin/Events/Activity',
    component: EventActivityTab,
    args: { eventId: 'event-1' },
    decorators: [withAdminShell],
} satisfies Meta<typeof EventActivityTab>;

export default meta;
type Story = StoryObj<typeof meta>;

// A one-evening wedding: opens on the wedding day, with the wishbook.
export const Wedding: Story = {
    beforeEach({ msw }) {
        msw.use(respondWith(weddingActivityFixture));
    },
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).AdminPage.events.activity;
        await expect(await within(canvasElement).findByRole('heading', { name: copy.hourly.title })).toBeInTheDocument();
    },
};

// A three-day festival with professional uploads and a quiz, and no wishbook.
export const MultiDay: Story = {
    beforeEach({ msw }) {
        msw.use(respondWith(festivalActivityFixture));
    },
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).AdminPage.events.activity;
        await expect(await within(canvasElement).findByRole('heading', { name: copy.hourly.title })).toBeInTheDocument();
    },
};

// Nothing added yet: the tiles at zero and no charts.
export const Empty: Story = {
    beforeEach({ msw }) {
        msw.use(respondWith(emptyActivityFixture));
    },
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).AdminPage.events.activity;
        await expect(await within(canvasElement).findByText(copy.empty)).toBeInTheDocument();
    },
};

// Loading: a response that never arrives.
export const Loading: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.get(ACTIVITY_URL, async () => {
                await delay('infinite');
                return HttpResponse.json(weddingActivityFixture);
            }),
        );
    },
};

// Error: the shape Spring sends.
export const Failed: Story = {
    beforeEach({ msw }) {
        msw.use(http.get(ACTIVITY_URL, () => HttpResponse.json({ status: 500, errorCode: 'INTERNAL_ERROR' }, { status: 500 })));
    },
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).AdminPage.events.activity;
        await expect(await within(canvasElement).findByRole('button', { name: copy.refresh })).toBeInTheDocument();
    },
};
