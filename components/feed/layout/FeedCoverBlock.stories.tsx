import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';

import { withAppContext } from '@/.storybook/appContext';
import { storyEvent, storyHostMember, storyPhotos } from '@/.storybook/fixtures';
import { FeedCoverBlock } from '@/components/feed/layout/FeedCoverBlock';

const event = storyEvent();
const withPhoto = storyEvent({ coverMedia: storyPhotos[0] });

const meta = {
    title: 'Feed/Layout/FeedCoverBlock',
    component: FeedCoverBlock,
    args: { event, isHost: true, wishlist: false },
    parameters: { layout: 'fullscreen', app: { event, member: storyHostMember } },
    beforeEach({ msw }) {
        msw.use(http.get('*/api/*', () => new HttpResponse(null, { status: 404 })));
    },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="mx-auto max-w-2xl pb-3">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof FeedCoverBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

// No cover photo: Add cover photo in the corner.
export const NoCoverHost: Story = {};

export const NoCoverHostNarrow: Story = {
    tags: ['visual-mobile-only'],
    decorators: [
        (Story) => (
            <div className="w-[360px]">
                <Story />
            </div>
        ),
    ],
};

export const NoCoverNoSessions: Story = { args: { event: storyEvent({ sessions: [] }) } };

export const WithCover: Story = { args: { event: withPhoto } };

// Edit mode: no Add cover photo, and nothing under the settings button.
export const Editing: Story = { args: { editing: true } };
export const EditingWithCover: Story = { args: { event: withPhoto, editing: true } };

// The invitation shows its own Places: the cover leaves out its place buttons (KAN-293).
export const WithoutPlaces: Story = { tags: ['visual-desktop-only'], args: { places: false } };
export const WithoutPlacesNarrow: Story = {
    tags: ['visual-mobile-only'],
    args: { places: false },
    decorators: NoCoverHostNarrow.decorators,
};
