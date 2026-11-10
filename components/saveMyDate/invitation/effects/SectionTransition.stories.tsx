import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { transitionStoryArgs } from '@/components/saveMyDate/invitation/effects/effectStoryData';
import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';

const meta = {
    title: 'SaveMyDate/Effects/Section transitions',
    component: InvitationRenderer,
    parameters: { layout: 'fullscreen' },
    args: transitionStoryArgs('story-art', 'bottom'),
} satisfies Meta<typeof InvitationRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BottomEdge: Story = {};

export const TopEdge: Story = { args: transitionStoryArgs('story-art', 'top') };

// Below 760px the phone art replaces the desktop art.
export const WithPhoneArt: Story = { args: transitionStoryArgs('story-art-phone', 'bottom') };
