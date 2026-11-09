import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { textAnimationStoryArgs } from '@/components/saveMyDate/invitation/effects/effectStoryData';
import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';

// One story per text animation. Each plays once on load, so reload the story to see
// it again. They all end the same, so InvitationMotionAtRest.stories.tsx covers rest.
const meta = {
    title: 'SaveMyDate/Effects/Text animations',
    component: InvitationRenderer,
    tags: ['visual-skip'],
    parameters: { layout: 'fullscreen' },
    args: textAnimationStoryArgs('fade-up'),
} satisfies Meta<typeof InvitationRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FadeUp: Story = {};
export const FadeDown: Story = { args: textAnimationStoryArgs('fade-down') };
export const FadeIn: Story = { args: textAnimationStoryArgs('fade-in') };
export const SlideLeft: Story = { args: textAnimationStoryArgs('slide-left') };
export const SlideRight: Story = { args: textAnimationStoryArgs('slide-right') };
export const ZoomIn: Story = { args: textAnimationStoryArgs('zoom-in') };
export const ZoomOut: Story = { args: textAnimationStoryArgs('zoom-out') };
export const BlurIn: Story = { args: textAnimationStoryArgs('blur-in') };
export const RotateIn: Story = { args: textAnimationStoryArgs('rotate-in') };
export const BounceIn: Story = { args: textAnimationStoryArgs('bounce-in') };
export const LetterSpacingIn: Story = { args: textAnimationStoryArgs('letter-spacing-in') };
export const SkewIn: Story = { args: textAnimationStoryArgs('skew-in') };
export const FlipUp: Story = { args: textAnimationStoryArgs('flip-up') };
export const ElasticScale: Story = { args: textAnimationStoryArgs('elastic-scale') };
export const RevealMask: Story = { args: textAnimationStoryArgs('reveal-mask') };
export const SoftRise: Story = { args: textAnimationStoryArgs('soft-rise') };
export const FadeRotate: Story = { args: textAnimationStoryArgs('fade-rotate') };
export const TrackingReveal: Story = { args: textAnimationStoryArgs('tracking-reveal') };
export const ScalePop: Story = { args: textAnimationStoryArgs('scale-pop') };
export const SoftBounce: Story = { args: textAnimationStoryArgs('soft-bounce') };
export const MaskLeft: Story = { args: textAnimationStoryArgs('mask-left') };
export const MaskCenter: Story = { args: textAnimationStoryArgs('mask-center') };
export const GlowReveal: Story = { args: textAnimationStoryArgs('glow-reveal') };
export const SwingIn: Story = { args: textAnimationStoryArgs('swing-in') };
export const DropIn: Story = { args: textAnimationStoryArgs('drop-in') };
