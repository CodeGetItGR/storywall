import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ComponentProps } from 'react';
import { fn } from 'storybook/test';

import { FeedEditBlock } from '@/components/feed/edit/FeedEditBlock';
import { FeedGalleryBlock } from '@/components/feed/modules/FeedGalleryBlock';
import type { FeedMosaicTile } from '@/components/feed/modules/FeedGalleryMosaic';
import { feedModuleSection } from '@/lib/feedModuleBlocks';

const photo = (id: string, mediaUrl: string): FeedMosaicTile => ({ id, mediaUrl, mediaType: 'IMAGE', status: 'READY', thumbnailUrl: null });
const PHOTOS = [
    photo('p1', '/landing/03-wedding-ceremony-santorini.webp'),
    photo('p2', '/landing/04-wedding-reception-santorini.webp'),
    photo('p3', '/landing/couple-cheering-with-guests-under-lit-arch-at-night.webp'),
];
const upload = { onFiles: fn(), uploading: false, notice: null, accept: 'image/*,video/*', frame: null };

const meta = {
    title: 'Feed/Modules/FeedGalleryBlock',
    component: FeedGalleryBlock,
    args: {
        name: 'Photos',
        tiles: PHOTOS,
        more: 21,
        loading: false,
        photosHref: '/events/e1/tools/gallery',
        upload,
        archiveNote: false,
        available: true,
    },
    decorators: [
        (Story) => (
            <div className="max-w-md bg-[#f4efe9] py-6">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof FeedGalleryBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

// G2: one big photo, two small ones, the last saying how many more.
export const WithPhotos: Story = {};

// A video's still with its play mark, among photos.
export const WithVideo: Story = {
    args: {
        tiles: [PHOTOS[0], { id: 'v1', mediaUrl: '/missing.mp4', mediaType: 'VIDEO', status: 'READY', thumbnailUrl: PHOTOS[1].mediaUrl }, PHOTOS[2]],
    },
};

// One photo so far: the other tiles stay blank and there is no +N.
export const OnePhoto: Story = { args: { tiles: [PHOTOS[0]], more: 0 } };

// GE1: no photos yet.
export const Empty: Story = { args: { tiles: [], more: 0 } };

// While the gallery loads: plain tiles, no line.
export const Loading: Story = { args: { tiles: [], more: 0, loading: true } };

// Uploading, then the gallery page's line on how it went, and the download note where guests get the album.
export const Uploading: Story = { args: { upload: { ...upload, uploading: true } } };
export const Uploaded: Story = { args: { upload: { ...upload, notice: '2 uploaded, 0 failed.' }, archiveNote: true } };

// A read-only event: photos still show, no upload button.
export const ReadOnly: Story = { args: { upload: null } };

// The event lost the gallery: edit mode draws the empty look with the button off.
export const Gone: Story = { args: { tiles: [], more: 0, upload: null, available: false } };

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

const section = feedModuleSection('gallery', () => 'gallery');
const controls = { canHide: true, canDelete: true, movable: true, canMoveUp: true, canMoveDown: true };
const actions = { onToggleVisible: fn(), onDelete: fn(), onOpenSettings: fn(), onMenuOpenChange: fn() };

function EditModeBlock(args: ComponentProps<typeof FeedGalleryBlock>) {
    return (
        <DndContext>
            <SortableContext items={['gallery']}>
                <FeedEditBlock section={section} name={args.name} controls={controls} hasSettings={false} actions={actions} onCard>
                    <FeedGalleryBlock {...args} underTools />
                </FeedEditBlock>
            </SortableContext>
        </DndContext>
    );
}

// In edit mode: the real photos, the block's tools on top.
export const InEditMode: Story = { render: (args) => <EditModeBlock {...args} /> };
