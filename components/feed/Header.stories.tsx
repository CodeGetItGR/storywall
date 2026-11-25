import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ComponentProps, CSSProperties } from 'react';
import { expect, within } from 'storybook/test';

import { FeedBackdropLayer } from '@/components/event/FeedBackdropLayer';
import { Header } from '@/components/feed/Header';
import { eventThemeStyle } from '@/lib/eventTheme';
import { feedBackdropClassName, feedBackdropStyle, feedBackdropSurface, type FeedPageBackdrop } from '@/lib/feedPageBackdrop';
import { pageToneOf, pageToneProps, pageToneStyle } from '@/lib/pageTone';
import { cn } from '@/lib/utils';

const IMAGE = '/storybook-assets/light-photo.jpg';
const SOLID: FeedPageBackdrop = {
    color: '#dfe9e4',
    image: null,
    size: 'cover',
    repeat: 'no-repeat',
    position: 'center',
    tiled: false,
    fixed: false,
    cardColor: '#f2f6f4',
};
const TILED: FeedPageBackdrop = {
    ...SOLID,
    image: { desktop: IMAGE, mobile: IMAGE },
    size: 'var(--smd-bg-tile-size) auto',
    repeat: 'repeat',
    position: 'center top',
    tiled: true,
};
const COVER: FeedPageBackdrop = { ...SOLID, image: { desktop: IMAGE, mobile: IMAGE }, fixed: true };

const NAVY: FeedPageBackdrop = { ...SOLID, color: '#1B2A4A' };
const CORAL: FeedPageBackdrop = { ...SOLID, color: '#FF7A59' };
const DARK_IMAGE = '/storybook-assets/dark-photo.jpg';
const DARK_COVER: FeedPageBackdrop = {
    ...COVER,
    color: '#2F2B2D',
    image: { desktop: DARK_IMAGE, mobile: DARK_IMAGE },
    pictureTone: { mean: 0.03, dark: 0.01, light: 0.08 },
};

const BLOCKS = ['bg-primary', 'bg-ink', 'bg-white', 'bg-primary', 'bg-ink', 'bg-white'];

// The header over a scrolling page of blocks in other colours.
function ThemedHeader({ backdrop, ...props }: ComponentProps<typeof Header> & { backdrop: FeedPageBackdrop | null }) {
    const tone = pageToneOf(backdrop && feedBackdropSurface(backdrop));
    const style = { ...eventThemeStyle(backdrop?.color), ...feedBackdropStyle(backdrop), ...pageToneStyle(tone) } as CSSProperties;
    return (
        <div data-testid="page" className="no-scrollbar h-screen overflow-y-auto">
            <div data-event-scope="" {...pageToneProps(tone)} className={cn('bg-event', feedBackdropClassName(backdrop))} style={style}>
                {/* Fixed picture */}
                {backdrop?.fixed && <FeedBackdropLayer />}
                {/* Page */}
                <div className="feed-backdrop-content mx-auto max-w-2xl">
                    <Header {...props} />
                    {BLOCKS.map((color, index) => (
                        <div key={index} data-testid="block" className={cn('m-4 h-60 rounded-xl', color)} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// Scrolls a block under the header, then checks a tap on the fade reaches the block.
const scrollUnder = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const page = await within(canvasElement).findByTestId('page');
    page.scrollTop = 150;
    page.dispatchEvent(new Event('scroll'));
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    const header = page.querySelector('.sticky.z-20')!.getBoundingClientRect();
    const tapped = document.elementFromPoint(header.left + header.width / 2, header.bottom + 5);
    await expect(tapped).toHaveAttribute('data-testid', 'block');
};

// The story clock is fixed at 2026-06-15 12:00 UTC (see preview.tsx).
const meta = {
    title: 'Feed/Header',
    component: Header,
    args: { eventId: 'evt-story', countdownTime: Date.parse('2026-07-04T15:00:00Z') },
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CountingDown: Story = {};

export const Started: Story = {
    args: { countdownTime: Date.parse('2026-06-01T15:00:00Z') },
};

// The header's edge fades over what scrolls under it, on every kind of page.
export const ScrolledOnWall: Story = { render: (args) => <ThemedHeader {...args} backdrop={null} />, play: scrollUnder };
export const ScrolledOnSolid: Story = { render: (args) => <ThemedHeader {...args} backdrop={SOLID} />, play: scrollUnder };
export const ScrolledOnTiled: Story = { render: (args) => <ThemedHeader {...args} backdrop={TILED} />, play: scrollUnder };
export const ScrolledOnCover: Story = { render: (args) => <ThemedHeader {...args} backdrop={COVER} />, play: scrollUnder };

// A dark page keeps the header dark, with a light logo and countdown; a middle colour gets dark text.
export const OnDarkSolid: Story = { render: (args) => <ThemedHeader {...args} backdrop={NAVY} /> };
export const OnMiddleSolid: Story = { render: (args) => <ThemedHeader {...args} backdrop={CORAL} /> };
export const ScrolledOnDarkCover: Story = { render: (args) => <ThemedHeader {...args} backdrop={DARK_COVER} />, play: scrollUnder };

// At the top the fade is only a few pixels, so it doesn't show.
export const AtTheTop: Story = { render: (args) => <ThemedHeader {...args} backdrop={TILED} /> };
