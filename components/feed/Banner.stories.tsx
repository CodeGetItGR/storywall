import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { storyEvent } from '@/.storybook/fixtures';
import { Banner } from '@/components/feed/Banner';
import { EventSessionActionButtons } from '@/components/feed/EventSessionActionButtons';

// Also shows BannerFallback (no cover), BannerOverlay (title and actions) and the LightRay glow.
const meta = {
    title: 'Feed/Banner',
    component: Banner,
    args: {
        image: '/images/banner.jpg',
        title: 'Eleni & Nikos',
        glowVisible: false,
    },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-2xl">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithCover: Story = {};

// The ceremony and reception buttons sit on the right edge.
export const WithSessionButtons: Story = {
    args: { actions: <EventSessionActionButtons event={storyEvent()} /> },
};

export const WithGlow: Story = {
    args: { glowVisible: true },
    parameters: { chromatic: { disableSnapshot: true } },
};

export const NoCover: Story = {
    args: { image: null },
};

// A host without a cover gets a shortcut to add one.
export const NoCoverHost: Story = {
    args: { image: null, fallbackActionHref: '/events/evt-story/manage', fallbackActionLabel: 'Add a cover photo' },
};

// A theme's illustration replaces the cover, with the title below it.
export const Illustration: Story = {
    args: { illustrationUrl: '/landing/decor-01.webp' },
};

export const LongTitle: Story = {
    args: { title: 'Alexandra Konstantinopoulou & Panagiotis Hatzigeorgiou celebrate their wedding' },
};
