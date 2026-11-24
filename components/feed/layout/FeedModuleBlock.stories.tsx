import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ComponentProps } from 'react';
import { fn } from 'storybook/test';

import { FeedEditBlock } from '@/components/feed/edit/FeedEditBlock';
import { FeedModuleBlock } from '@/components/feed/layout/FeedModuleBlock';
import { feedModuleSection } from '@/lib/feedModuleBlocks';

const meta = {
    title: 'Feed/Layout/FeedModuleBlock',
    component: FeedModuleBlock,
    args: { module: 'playlist', eventType: 'WEDDING', href: '/events/e1/tools/playlist', available: true },
    decorators: [
        (Story) => (
            <div className="min-h-[320px] max-w-md bg-[#f4efe9] py-6">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof FeedModuleBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playlist: Story = {};
export const Wishbook: Story = { args: { module: 'wishbook', href: '/events/e1/tools/wishbook' } };

// The event lost the module: edit mode still draws the block, with the button off.
export const Gone: Story = { args: { available: false } };

const section = feedModuleSection('playlist', () => 'module');
const controls = { canHide: true, canDelete: true, movable: true, canMoveUp: true, canMoveDown: true };
const actions = {
    onToggleVisible: fn(),
    onDelete: fn(),
    onOpenSettings: fn(),
    onMenuOpenChange: fn(),
};

function EditModeBlock({ visible, ...args }: ComponentProps<typeof FeedModuleBlock> & { visible: boolean }) {
    return (
        <DndContext>
            <SortableContext items={['module']}>
                <FeedEditBlock section={{ ...section, visible }} name="Playlist" controls={controls} hasSettings={false} actions={actions}>
                    <FeedModuleBlock {...args} />
                </FeedEditBlock>
            </SortableContext>
        </DndContext>
    );
}

// In edit mode: the block tools inside the card, no settings.
export const InEditMode: Story = { render: (args) => <EditModeBlock {...args} visible /> };
export const InEditModeHidden: Story = { render: (args) => <EditModeBlock {...args} visible={false} /> };
