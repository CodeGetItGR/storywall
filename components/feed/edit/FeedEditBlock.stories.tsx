import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { FeedEditBlock } from '@/components/feed/edit/FeedEditBlock';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

const section = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };

const meta = {
    title: 'Feed/Edit/FeedEditBlock',
    component: FeedEditBlock,
    decorators: [
        (Story) => (
            <DndContext>
                <SortableContext items={['dress']}>
                    <Story />
                </SortableContext>
            </DndContext>
        ),
    ],
    args: {
        section,
        // Story data standing in for the translated block name.
        name: 'Dress code',
        controls: { canHide: true, canDelete: true, movable: true, canMoveUp: true, canMoveDown: false },
        hasSettings: true,
        actions: { onToggleVisible: fn(), onMove: fn(), onDelete: fn(), onOpenSettings: fn() },
        children: <div className="h-40 bg-[#f4efe9]" />,
    },
} satisfies Meta<typeof FeedEditBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Visible: Story = {};
export const Hidden: Story = { args: { section: { ...section, visible: false } } };
// Its settings are open.
export const Active: Story = { args: { active: true } };
