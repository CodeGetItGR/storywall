import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { effectStoryArgs, textAnimationStoryArgs } from '@/components/saveMyDate/invitation/effects/effectStoryData';
import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';

// What someone who prefers less motion sees, which is also how the visual check
// captures: everything in place, nothing moving and nothing left hidden.
const meta = {
    title: 'SaveMyDate/Effects/At rest',
    component: InvitationRenderer,
    parameters: { layout: 'fullscreen' },
    args: effectStoryArgs('slowZoom'),
} satisfies Meta<typeof InvitationRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BackgroundEffect: Story = {};

// A reveal starts with its background hidden, so this one could stay blank.
export const BackgroundReveal: Story = { args: effectStoryArgs('fade') };

// Particles and canvas paint nothing at rest.
export const Particles: Story = { args: effectStoryArgs('heartsDrift') };

// Text waiting for its reveal must not stay hidden.
export const TextAnimation: Story = { args: textAnimationStoryArgs('blur-in') };
