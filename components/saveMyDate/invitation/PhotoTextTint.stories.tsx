import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useLocale } from 'next-intl';
import { expect, waitFor } from 'storybook/test';

import { hiddenDate, STORY_THEME, storyDocument, storyInvitationMedia, storySection } from '@/.storybook/invitation';
import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import { requestPhotoTone } from '@/lib/invitation/photoToneStore';
import type { MediaResolver } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

// Text on a photo background. Once the photo is measured, a soft tint goes
// between it and the text when the text would be hard to read.

// The light and dark photos are the venue photo, washed out and darkened.
const PHOTOS: Record<string, string> = {
    'story-light-photo': '/storybook-assets/light-photo.jpg',
    'story-dark-photo': '/storybook-assets/dark-photo.jpg',
    'story-busy-photo': '/images/venue.png',
    // The busy photo again, at an address the store is told it can't measure,
    // as when a photo's server sends no CORS headers.
    'story-unmeasurable-photo': '/images/venue.png?unmeasurable',
};

// A gold the host picked for the first name.
const HOST_GOLD = '#c9a24b';

const media: MediaResolver = (mediaId) => PHOTOS[mediaId] ?? storyInvitationMedia(mediaId);

type Contrast = InvitationSection['style']['textContrast'];

function onPhoto(section: InvitationSection, mediaId: string, textContrast: Contrast): InvitationSection {
    return { ...section, style: { ...section.style, textContrast, background: { kind: 'image', image: { source: 'media', mediaId } } } };
}

type PhotoStoryProps = { mediaId?: string; textContrast?: Contrast; themeBackground?: boolean; nameColor?: string };

// The sections whose titles were unreadable on the staging preview's venue photo.
function PhotoStory({ mediaId = 'story-busy-photo', textContrast = 'auto', themeBackground = false, nameColor }: PhotoStoryProps) {
    const locale = useLocale();
    const names = storySection('coupleNames');
    const namesStyled = nameColor ? { ...names, textStyles: { partnerAName: { color: nameColor } } } : names;
    const sections = [namesStyled, storySection('dressCode')].map((section) =>
        themeBackground
            ? { ...section, style: { ...section.style, textContrast, background: { kind: 'theme' as const, slot: 'top' as const } } }
            : onPhoto(section, mediaId, textContrast),
    );

    return <InvitationRenderer document={storyDocument([hiddenDate(locale), ...sections])} theme={STORY_THEME} media={media} />;
}

const meta = {
    title: 'SaveMyDate/Invitation/PhotoTextTint',
    component: PhotoStory,
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PhotoStory>;

export default meta;
type Story = StoryObj<typeof meta>;

// A large photo can take a few seconds to measure on a slow machine.
const MEASURE_WAIT = { timeout: 15000 };

const tints = (canvasElement: HTMLElement) => canvasElement.querySelectorAll<HTMLElement>('[class*="smd-photo-tint-text-"]');
const measured = (canvasElement: HTMLElement) => waitFor(() => expect(canvasElement.querySelector('[data-photo-tone="pending"]')).toBeNull(), MEASURE_WAIT);

// Dark text already reads on a light photo: nothing changes.
export const LightPhoto: Story = {
    args: { mediaId: 'story-light-photo' },
    play: async ({ canvasElement }) => {
        await measured(canvasElement);
        await expect(tints(canvasElement)).toHaveLength(0);
    },
};

// White text, no tint needed.
export const DarkPhoto: Story = {
    args: { mediaId: 'story-dark-photo' },
    play: async ({ canvasElement }) => {
        await waitFor(() => expect(tints(canvasElement)).toHaveLength(2), MEASURE_WAIT);
        await expect(tints(canvasElement)[0]).toHaveClass('smd-photo-tint-text-light');
    },
};

// A dark tint under white text.
export const BusyPhoto: Story = {
    args: { mediaId: 'story-busy-photo' },
    play: async ({ canvasElement }) => {
        await waitFor(() => expect(tints(canvasElement)).toHaveLength(2), MEASURE_WAIT);
        await expect(tints(canvasElement)[0].style.background).toMatch(/^rgba\(0, 0, 0, 0\.\d+\)$/);
    },
};

// The theme's own background photo, as on the staging preview.
export const ThemeBackgroundPhoto: Story = {
    args: { themeBackground: true },
    play: async ({ canvasElement }) => {
        await waitFor(() => expect(tints(canvasElement)).toHaveLength(2), MEASURE_WAIT);
    },
};

// The host picked the theme's text colour by hand, so it stays as it is.
export const HostPickedContrast: Story = {
    args: { mediaId: 'story-busy-photo', textContrast: 'base' },
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelectorAll('.smd-photo-tint')).toHaveLength(0);
    },
};

// White text on the tint, but the name the host coloured stays gold.
export const HostColouredField: Story = {
    args: { mediaId: 'story-busy-photo', nameColor: HOST_GOLD },
    play: async ({ canvasElement }) => {
        await waitFor(() => expect(tints(canvasElement)).toHaveLength(2), MEASURE_WAIT);
        const [gold, plain] = canvasElement.querySelectorAll<HTMLElement>('.couple-name');
        // With reduced motion on (as in the visual check) the app gives every
        // element a 1ms transition, so the new colour lands a frame or two
        // after the tint.
        await waitFor(() => {
            expect(getComputedStyle(gold).color).toBe('rgb(201, 162, 75)');
            expect(getComputedStyle(plain).color).toBe('rgb(255, 255, 255)');
        });
    },
};

// A photo that can't be measured stays as it is: no tint, the theme's text colour.
export const UnmeasurablePhoto: Story = {
    args: { mediaId: 'story-unmeasurable-photo' },
    loaders: [
        () => {
            requestPhotoTone(PHOTOS['story-unmeasurable-photo'], async () => undefined);
        },
    ],
    play: async ({ canvasElement }) => {
        await measured(canvasElement);
        await expect(tints(canvasElement)).toHaveLength(0);
    },
};
