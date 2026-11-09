import '../invitation.css';
import './effects.css';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useTranslations } from 'next-intl';

import { FRAME_ANIMATIONS } from '@/lib/invitation/elements';
import { frameAnimationClass } from '@/lib/invitation/render';

// Every photo frame animation side by side, on a stand-in for the frame's inner box.
function FrameAnimationsDemo() {
    const t = useTranslations('InvitationRenderer');

    return (
        <div className="smd-invitation grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
            {/* Frames */}
            {FRAME_ANIMATIONS.map((animation) => (
                <figure key={animation} className={frameAnimationClass(animation)}>
                    <div className="photo-frame-inner">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/images/couple-hero.png" alt={t('imageAlt')} className="aspect-square w-full object-cover" />
                    </div>
                    <figcaption className="pt-1 font-mono text-xs">{animation}</figcaption>
                </figure>
            ))}
        </div>
    );
}

// visual-skip: most of these never come to rest.
const meta = {
    title: 'SaveMyDate/Effects/Frame animations',
    component: FrameAnimationsDemo,
    tags: ['visual-skip'],
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof FrameAnimationsDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EveryAnimation: Story = {};
