import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';
import { fn } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { storyEvent, storyHostMember, storyPhotos } from '@/.storybook/fixtures';
import { FeedEditPill } from '@/components/feed/edit/FeedEditPill';
import { FeedCoverBlock } from '@/components/feed/layout/FeedCoverBlock';

const event = storyEvent();
const withPhoto = storyEvent({ coverMedia: storyPhotos[0] });

const meta = {
    title: 'Feed/Layout/FeedCoverBlock',
    component: FeedCoverBlock,
    args: { event, isHost: true, wishlist: false, corner: <FeedEditPill onClick={fn()} /> },
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

// No cover photo: Add cover photo beside the Edit pill, on the next line where the two don't fit beside the session buttons.
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

// Without session buttons there is more room on the line.
export const NoCoverNoSessions: Story = { args: { event: storyEvent({ sessions: [] }) } };

// A host whose plan has no feed editing.
export const NoCoverNoEditPill: Story = { args: { corner: undefined } };

export const WithCover: Story = { args: { event: withPhoto } };

// Edit mode: no Add cover photo, and nothing under the settings button.
export const Editing: Story = { args: { corner: undefined, editing: true } };
export const EditingWithCover: Story = { args: { event: withPhoto, corner: undefined, editing: true } };
