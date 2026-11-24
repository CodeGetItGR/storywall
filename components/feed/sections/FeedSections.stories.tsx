import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyEvent, storySession } from '@/.storybook/fixtures';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { FeedBlockPlaceholder } from '@/components/feed/edit/FeedBlockPlaceholder';
import { FeedModeSection } from '@/components/feed/sections/FeedModeSection';
import type { EventDetailResponseDto, EventSessionResponseDto } from '@/lib/api/types';
import { createFeedModeSection } from '@/lib/feedSections';
import type { InvitationSection } from '@/lib/invitation/sections';

function eventWith(sessions: EventSessionResponseDto[]): EventDetailResponseDto {
    const event = storyEvent({ sessions });
    return { ...event, schedule: { ...event.schedule, startAt: sessions[0].startAt } };
}

const upcoming = eventWith([
    storySession(),
    storySession({
        id: 'ses-party',
        title: 'Reception',
        startAt: '2026-07-04T18:00:00Z',
        locationName: 'Ktima Orizontes',
        isMain: false,
        isSecondary: true,
    }),
]);

// Around the story clock (2026-06-15 12:00 UTC, 15:00 in Athens): one over, one on now, one to come.
const today = eventWith([
    storySession({ startAt: '2026-06-15T08:00:00Z', endAt: '2026-06-15T09:30:00Z' }),
    storySession({
        id: 'ses-lunch',
        title: 'Lunch',
        startAt: '2026-06-15T11:00:00Z',
        endAt: '2026-06-15T13:30:00Z',
        locationName: 'Ktima Orizontes',
    }),
    storySession({ id: 'ses-party', title: 'Party', startAt: '2026-06-15T18:00:00Z', locationName: null }),
]);

const longTitles = eventWith([
    storySession({
        title: 'The ceremony, with the whole family and everyone who travelled from abroad',
        startAt: '2026-06-15T11:00:00Z',
        endAt: '2026-06-15T13:30:00Z',
        locationName: 'Agios Nikolaos church, by the old harbour, next to the lighthouse',
    }),
    storySession({ id: 'ses-party', title: 'Party', startAt: '2026-06-15T18:00:00Z', locationName: null }),
]);

const prompt = (text: string) => ({ ...createFeedModeSection('feedPrompt', () => 'prompt'), data: { text } }) as InvitationSection;

// Pinned photos: the story's own files stand for the host's uploads.
const PHOTOS: Record<string, string> = {
    florals: '/images/post-florals.png',
    cake: '/images/post-cake.png',
    flowers: '/images/post-flowers.png',
    tux: '/images/post-tux.png',
    venue: '/images/venue.png',
    cake2: '/images/post-cake.png',
};
const media = (id: string) => PHOTOS[id];
const pinned = (mediaIds: string[]) =>
    ({
        ...createFeedModeSection('feedPinned', () => 'pinned'),
        data: { photos: mediaIds.map((mediaId) => ({ id: mediaId, image: { source: 'media', mediaId } })) },
    }) as InvitationSection;

// Also shows FeedScheduleSection, FeedPromptSection, FeedPinnedSection and FeedPinnedPhotos.
const meta = {
    title: 'Feed/Sections/FeedModeSection',
    component: FeedModeSection,
    args: { event: upcoming, section: createFeedModeSection('feedSchedule', () => 'schedule'), media },
    parameters: { layout: 'fullscreen' },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="mx-auto max-w-2xl bg-event py-2">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof FeedModeSection>;

export default meta;
type Story = StoryObj<typeof meta>;

// Before the event: the first day's sessions, all to come.
export const Schedule: Story = {};

export const ScheduleNow: Story = { args: { event: today } };

export const ScheduleLongTitles: Story = { args: { event: longTitles } };

export const ScheduleMobile: Story = { ...ScheduleNow, globals: { viewport: { value: 'mobile' } } };

export const ScheduleAddToCalendar: Story = {
    play: async ({ canvasElement, globals }) => {
        const label = copyFor(globals).FeedPage.addToCalendar;
        await userEvent.click(await within(canvasElement).findByRole('button', { name: label }));
        await waitForOpen('dialog');
    },
};

// The host's own words, in the language the story is shown in.
export const PhotoPrompt: Story = {
    render: (args, { globals }) => <FeedModeSection {...args} section={prompt(copyFor(globals).FeedSections.prompt.placeholder)} />,
};

export const PhotoPromptMobile: Story = { ...PhotoPrompt, globals: { viewport: { value: 'mobile' } } };

// A viewer who can't post sees the line without the plus.
export const PhotoPromptReadOnly: Story = {
    ...PhotoPrompt,
    parameters: { app: { composer: { canComposePost: false } } },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).queryByRole('button')).toBeNull();
    },
};

export const PinnedPhotos: Story = { args: { section: pinned(['florals', 'cake', 'flowers']), opensPhotos: true } };

export const PinnedPhotosSix: Story = {
    args: { section: pinned(['florals', 'cake', 'flowers', 'tux', 'venue', 'cake2']), opensPhotos: true },
};

export const PinnedPhotosMobile: Story = { ...PinnedPhotosSix, globals: { viewport: { value: 'mobile' } } };

// Full screen, on the second photo.
export const PinnedPhotosOpen: Story = {
    ...PinnedPhotos,
    play: async ({ canvasElement }) => {
        await userEvent.click((await within(canvasElement).findAllByRole('button'))[1]);
        await waitForOpen('dialog');
    },
};

export const PinnedPhotosEmptyInEdit: Story = {
    args: { section: pinned([]) },
    render: (args, { globals }) => (
        <FeedModeSection {...args} placeholder={<FeedBlockPlaceholder name={copyFor(globals).InvitationEditor.sectionNames.feedPinned} />} />
    ),
};
