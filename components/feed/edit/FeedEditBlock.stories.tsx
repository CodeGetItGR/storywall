import '@/components/event/feedBackdrop.css';

import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { CSSProperties } from 'react';
import { fn } from 'storybook/test';

import { FeedEditBlock } from '@/components/feed/edit/FeedEditBlock';
import { eventThemeStyle } from '@/lib/eventTheme';
import { newFeedBlock } from '@/lib/feedLayout';
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
        actions: { onToggleVisible: fn(), onDelete: fn(), onOpenSettings: fn() },
        children: <div className="h-40 bg-[#f4efe9]" />,
    },
} satisfies Meta<typeof FeedEditBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Visible: Story = {};
export const Hidden: Story = { args: { section: { ...section, visible: false } } };
// The cover: no eye and no name on screen, only its settings.
export const Cover: Story = {
    args: {
        section: newFeedBlock('feedCover'),
        name: 'Cover',
        controls: { canHide: false, canDelete: false, movable: false, canMoveUp: false, canMoveDown: false },
    },
};
// Its settings are open.
export const Active: Story = { args: { active: true } };

// On a Save my date theme: no strip above the block, the tools float over it on the page.
export const OnThemedPage: Story = {
    decorators: [
        (Story) => (
            <div
                className="feed-backdrop bg-event p-4"
                style={
                    {
                        ...eventThemeStyle('#EFE7EC'),
                        '--feed-backdrop-mobile': 'url("/storybook-assets/light-photo.jpg")',
                        '--feed-backdrop-desktop': 'url("/storybook-assets/light-photo.jpg")',
                        '--feed-backdrop-size': '100% auto',
                        '--feed-backdrop-repeat': 'repeat-y',
                        '--feed-backdrop-position': 'center top',
                    } as CSSProperties
                }
            >
                <Story />
            </div>
        ),
    ],
};
