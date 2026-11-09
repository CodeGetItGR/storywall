import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { effectStoryArgs } from '@/components/saveMyDate/invitation/effects/effectStoryData';
import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';

// One story per effect. The visual check captures with motion turned off, where
// they all look the same, so InvitationMotionAtRest.stories.tsx covers that state.
const meta = {
    title: 'SaveMyDate/Effects/Background',
    component: InvitationRenderer,
    tags: ['visual-skip'],
    parameters: { layout: 'fullscreen' },
    args: effectStoryArgs('slowZoom'),
} satisfies Meta<typeof InvitationRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SlowZoom: Story = {};
export const SlowZoomSlowAndSubtle: Story = { args: effectStoryArgs('slowZoom', 'slow', 'subtle') };
export const ZoomOut: Story = { args: effectStoryArgs('zoomOut') };
export const KenBurnsLeft: Story = { args: effectStoryArgs('kenBurnsLeft') };
export const KenBurnsRight: Story = { args: effectStoryArgs('kenBurnsRight') };
export const CinematicPulse: Story = { args: effectStoryArgs('cinematicPulse') };
export const Drift: Story = { args: effectStoryArgs('drift') };
export const SoftGlow: Story = { args: effectStoryArgs('softGlow') };
export const LightSweep: Story = { args: effectStoryArgs('lightSweep') };
export const GradientFlow: Story = { args: effectStoryArgs('gradientFlow') };
export const ConfettiBurst: Story = { args: effectStoryArgs('confettiBurst') };
export const CanvasRealistic: Story = { args: effectStoryArgs('canvasRealistic') };
export const CanvasFireworks: Story = { args: effectStoryArgs('canvasFireworks') };
export const CanvasStars: Story = { args: effectStoryArgs('canvasStars') };
export const CanvasSnow: Story = { args: effectStoryArgs('canvasSnow') };
export const Fade: Story = { args: effectStoryArgs('fade') };
export const BlurReveal: Story = { args: effectStoryArgs('blurReveal') };
export const VignettePulse: Story = { args: effectStoryArgs('vignettePulse') };
export const AuroraGlow: Story = { args: effectStoryArgs('auroraGlow') };
export const Shimmer: Story = { args: effectStoryArgs('shimmer') };
export const SpotlightSweep: Story = { args: effectStoryArgs('spotlightSweep') };
export const SoftFog: Story = { args: effectStoryArgs('softFog') };
export const LightRays: Story = { args: effectStoryArgs('lightRays') };
export const FloatingDust: Story = { args: effectStoryArgs('floatingDust') };
export const SoftSparkles: Story = { args: effectStoryArgs('softSparkles') };
export const FallingPetals: Story = { args: effectStoryArgs('fallingPetals') };
export const HeartsDrift: Story = { args: effectStoryArgs('heartsDrift') };
export const GoldenDust: Story = { args: effectStoryArgs('goldenDust') };
export const AutumnLeaves: Story = { args: effectStoryArgs('autumnLeaves') };
export const ChristmasTwinkle: Story = { args: effectStoryArgs('christmasTwinkle') };
export const BokehLights: Story = { args: effectStoryArgs('bokehLights') };
