import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ComponentProps } from 'react';
import { fn } from 'storybook/test';

import { STORY_VOICE_WISH_URL } from '@/.storybook/fixtures';
import { FeedEditBlock } from '@/components/feed/edit/FeedEditBlock';
import { FeedWishbookBlock } from '@/components/feed/modules/FeedWishbookBlock';
import type { FeedWish } from '@/components/feed/modules/FeedWishCard';
import { feedModuleSection } from '@/lib/feedModuleBlocks';

const WISHES: FeedWish[] = [
    {
        id: 'w1',
        guestName: 'Maria',
        message: 'May you grow old together and always laugh like today!',
        audio: null,
        createdAt: '2026-11-20T18:30:00Z',
    },
    { id: 'w2', guestName: 'Eleni & George', message: 'Wishing you a life full of trips.', audio: null, createdAt: '2026-11-20T17:05:00Z' },
    { id: 'w3', guestName: 'Nikos', message: 'The most beautiful wedding!', audio: null, createdAt: '2026-11-20T16:40:00Z' },
    { id: 'w4', guestName: 'Sofia', message: 'Congratulations to you both.', audio: null, createdAt: '2026-11-20T16:10:00Z' },
];

const meta = {
    title: 'Feed/Modules/FeedWishbookBlock',
    component: FeedWishbookBlock,
    args: {
        name: 'Wishbook',
        wishes: WISHES,
        loading: false,
        isHost: true,
        writeHref: null,
        listHref: '/events/e1/tools/wishbook',
        total: 18,
        available: true,
    },
    decorators: [
        (Story) => (
            <div className="max-w-md bg-[#f4efe9] py-6">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof FeedWishbookBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

// C1 for a host: everyone's newest wishes, the dots, and the link to all of them. Hosts don't write.
export const HostWithWishes: Story = {};

// A guest: their own wishes, the Write button and the link to their list.
export const GuestOwnWishes: Story = {
    args: {
        isHost: false,
        wishes: WISHES.slice(0, 2),
        total: 2,
        writeHref: '/events/e1/tools/wishbook',
        listHref: '/events/e1/tools/wishbook#my-wishes-title',
    },
};

// One wish: no dots.
export const OneWish: Story = { args: { wishes: WISHES.slice(0, 1), total: 1 } };

// A wish with a recording, and a voice-only one.
export const VoiceWishes: Story = {
    args: {
        wishes: [
            { ...WISHES[0], audio: { url: STORY_VOICE_WISH_URL, durationMs: 42_000 } },
            { ...WISHES[1], message: null, audio: { url: STORY_VOICE_WISH_URL, durationMs: 18_000 } },
        ],
        total: 2,
    },
};

// WE1 for a guest who hasn't written yet.
export const EmptyGuest: Story = { args: { isHost: false, wishes: [], total: 0, listHref: null, writeHref: '/events/e1/tools/wishbook' } };

// A host with no wishes yet: the blank card, no button.
export const EmptyHost: Story = { args: { wishes: [], total: 0, listHref: null } };

// The event lost the wishbook: edit mode draws the empty look with the button off.
export const Gone: Story = { args: { wishes: [], total: 0, listHref: null, available: false } };

// A dark theme: the card stays white.
export const DarkTheme: Story = {
    decorators: [
        (Story) => (
            <div className="bg-[#1f1b2d] py-6">
                <Story />
            </div>
        ),
    ],
};

const section = feedModuleSection('wishbook', () => 'wishbook');
const controls = { canHide: true, canDelete: true, movable: true, canMoveUp: true, canMoveDown: true };
const actions = { onToggleVisible: fn(), onDelete: fn(), onOpenSettings: fn(), onMenuOpenChange: fn() };

function EditModeBlock(args: ComponentProps<typeof FeedWishbookBlock>) {
    return (
        <DndContext>
            <SortableContext items={['wishbook']}>
                <FeedEditBlock section={section} name={args.name} controls={controls} hasSettings={false} actions={actions} onCard>
                    <FeedWishbookBlock {...args} underTools />
                </FeedEditBlock>
            </SortableContext>
        </DndContext>
    );
}

// In edit mode: the real wishes, the block's tools on top.
export const InEditMode: Story = { render: (args) => <EditModeBlock {...args} /> };
