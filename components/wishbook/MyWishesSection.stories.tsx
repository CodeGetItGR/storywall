import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { STORY_VOICE_WISH_URL } from '@/.storybook/fixtures';
import { MyWishesSection } from '@/components/wishbook/MyWishesSection';

const entries = [
    {
        id: 'wish-1',
        eventId: 'evt-story',
        authorMemberId: 'mem-me',
        guestName: 'Nikos Alexiou',
        message: 'Wishing you a lifetime of love, laughter and long summer evenings together. We cannot wait to celebrate with you both.',
        createdAt: '2026-06-14T18:00:00Z',
        audio: null,
        canDelete: true,
        highlighted: null,
    },
    {
        id: 'wish-2',
        eventId: 'evt-story',
        authorMemberId: 'mem-me',
        guestName: 'Nikos Alexiou',
        message: 'Να ζήσετε!',
        createdAt: '2026-06-13T10:00:00Z',
        audio: null,
        canDelete: true,
        highlighted: null,
    },
];

// One written wish, one recorded only, one with both.
const voiceEntries = [
    entries[1],
    { ...entries[0], id: 'wish-3', message: null, audio: { url: STORY_VOICE_WISH_URL, durationMs: 42_000 }, createdAt: '2026-06-14T20:00:00Z' },
    { ...entries[0], id: 'wish-4', audio: { url: STORY_VOICE_WISH_URL, durationMs: 9_000 }, createdAt: '2026-06-14T19:00:00Z' },
];

const meta = {
    title: 'Wishbook/MyWishesSection',
    component: MyWishesSection,
    args: { entries, isLoading: false, hasNextPage: false, isFetchingNextPage: false, onLoadMore: fn(), canEdit: true, onSelect: fn() },
    decorators: [
        (Story) => (
            <div className="max-w-md p-4">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof MyWishesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Editable: Story = {};
export const ReadOnly: Story = { args: { canEdit: false } };
export const WithMore: Story = { args: { hasNextPage: true } };
export const Loading: Story = { args: { isLoading: true, entries: [] } };
export const VoiceWish: Story = { args: { entries: voiceEntries } };
export const VoiceWishReadOnly: Story = { args: { entries: voiceEntries, canEdit: false } };
