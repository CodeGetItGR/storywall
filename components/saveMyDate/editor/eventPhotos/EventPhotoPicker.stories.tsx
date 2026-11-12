import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { STORY_EVENT_ID, storyMedia } from '@/.storybook/fixtures';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { EventPhotoPicker } from '@/components/saveMyDate/editor/eventPhotos/EventPhotoPicker';

const PHOTOS = ['/images/post-florals.png', '/images/post-florals.png', '/images/post-florals.png', '/images/post-florals.png'];

function mediaPage(urls: string[]) {
    return {
        content: urls.map((url, index) => storyMedia(`m-event-${index}`, { mediaUrl: url })),
        page: { size: 30, number: 0, totalElements: urls.length, totalPages: 1 },
    };
}

// The picker keeps its picks, as the gallery settings will.
function PickerStory({ limit, initial = [] }: { limit: number; initial?: string[] }) {
    const [selected, setSelected] = useState(initial);
    return <EventPhotoPicker open onClose={fn()} eventId={STORY_EVENT_ID} selectedIds={selected} limit={limit} onChange={setSelected} />;
}

// Adding the event's own photos to the invitation's gallery (KAN-84).
const meta = {
    title: 'SaveMyDate/Editor/EventPhotoPicker',
    component: PickerStory,
    decorators: [withAppContext],
    args: { limit: 9, initial: ['m-event-1'] },
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    beforeEach({ msw }) {
        msw.use(http.get(`*/api/events/${STORY_EVENT_ID}/media`, () => HttpResponse.json(mediaPage(PHOTOS))));
    },
} satisfies Meta<typeof PickerStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ globals }) => {
        const sheet = within(await waitForOpen('dialog'));
        const alt = copyFor(globals).InvitationEditor.eventPhotos.photoAlt;
        const first = await sheet.findByAltText(alt.replace('{n}', '1'));
        await userEvent.click(first);
        await expect(first.closest('button')).toHaveAttribute('aria-pressed', 'true');
    },
};

export const Full: Story = { args: { limit: 1 } };

export const NoPhotos: Story = {
    beforeEach({ msw }) {
        msw.use(http.get(`*/api/events/${STORY_EVENT_ID}/media`, () => HttpResponse.json(mediaPage([]))));
    },
    play: async ({ globals }) => {
        const sheet = within(await waitForOpen('dialog'));
        await expect(await sheet.findByText(copyFor(globals).InvitationEditor.eventPhotos.empty)).toBeVisible();
    },
};
