import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { fn } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { guestAuthor, STORY_GUEST_MEMBER_ID, storyAuthor, storyEvent, storyStory } from '@/.storybook/fixtures';
import { StoriesRow } from '@/components/feed/StoriesRow';
import type { StoryResponseDto } from '@/lib/api/types';

const me = storyAuthor({ memberId: STORY_GUEST_MEMBER_ID, displayName: 'Maria Papadopoulou', role: 'ATTENDEE' });
const others = [
    storyAuthor(),
    guestAuthor,
    storyAuthor({ memberId: 'mem-sofia', displayName: 'Sofia Ioannou', role: 'ATTENDEE', avatarUrl: '/images/post-tux.png' }),
    storyAuthor({ memberId: 'mem-kostas', displayName: 'Kostas Dimitriou', role: 'ATTENDEE' }),
    storyAuthor({ memberId: 'mem-anna', displayName: 'Anna Vlachou', role: 'ATTENDEE', avatarUrl: '/images/couple-hero.png' }),
    storyAuthor({ memberId: 'mem-giorgos', displayName: 'Giorgos Pappas', role: 'ATTENDEE' }),
];
const othersStories = others.map((author, index) => storyStory(`story-${index}`, author, { viewedByCurrentUser: index > 2 }));

function storiesHandler(stories: StoryResponseDto[]) {
    return http.get('*/api/events/:eventId/stories', () => HttpResponse.json(stories));
}

const meta = {
    title: 'Feed/StoriesRow',
    component: StoriesRow,
    args: { eventId: 'evt-story', onOpenStoryAction: fn() },
    decorators: [withAppContext],
    beforeEach({ msw }) {
        msw.use(storiesHandler(othersStories));
    },
} satisfies Meta<typeof StoriesRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithStories: Story = {};

export const WithYourStory: Story = {
    beforeEach({ msw }) {
        msw.use(storiesHandler([storyStory('story-me', me), ...othersStories]));
    },
};

// No stories and no schedule: the hint sits next to the add button.
export const Empty: Story = {
    parameters: { app: { event: storyEvent({ sessions: [] }) } },
    beforeEach({ msw }) {
        msw.use(storiesHandler([]));
    },
};

export const EmptyCannotShare: Story = {
    parameters: { app: { event: storyEvent({ sessions: [] }), composer: { canComposeStory: false } } },
    beforeEach({ msw }) {
        msw.use(storiesHandler([]));
    },
};

export const Loading: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/events/:eventId/stories', async () => {
                await delay('infinite');
                return HttpResponse.json([]);
            }),
        );
    },
};
