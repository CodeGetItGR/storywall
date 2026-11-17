import type { ComponentProps } from 'react';

import type { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import type { SectionEffect } from '@/lib/invitation/backgroundEffects';
import type { MediaResolver } from '@/lib/invitation/render';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { SectionStyle } from '@/lib/invitation/sectionStyle';
import type { TextAnimation } from '@/lib/invitation/textReveal';
import { PREVIEW_THEME } from '@/lib/saveMyDatePreview';

// Sample data for the effect stories: the preview theme, with a photo behind the
// sections so a moving background can be seen.

type RendererArgs = ComponentProps<typeof InvitationRenderer>;

const MEDIA: Record<string, string> = {
    'm-story-photo': '/images/venue.png',
    'm-story-art': '/images/post-florals.png',
    'm-story-art-phone': '/images/post-flowers.png',
};

const media: MediaResolver = (mediaId) => MEDIA[mediaId] ?? '/images/couple-hero.png';

const theme: RendererArgs['theme'] = {
    ...PREVIEW_THEME,
    backgrounds: { ...PREVIEW_THEME.backgrounds, top: { desktop: { mediaId: 'm-story-photo' }, mode: 'cover', stableRepeat: false } },
    transitions: [
        { id: 'story-art', name: 'Florals', desktop: { mediaId: 'm-story-art' } },
        { id: 'story-art-phone', name: 'Flowers', desktop: { mediaId: 'm-story-art' }, mobile: { mediaId: 'm-story-art-phone' } },
    ],
};

function storySection(id: string, style: Partial<SectionStyle>): InvitationSection {
    const sample = SAMPLE_SECTIONS.invitation;
    return { ...sample, id, style: { ...sample.style, background: { kind: 'theme', slot: 'top' }, minHeight: 420, ...style } };
}

function args(sections: InvitationSection[], textAnimation: TextAnimation = 'none'): RendererArgs {
    return { document: { ...SAMPLE_DOCUMENT, sections }, theme: { ...theme, textAnimation }, media };
}

export function effectStoryArgs(type: SectionEffect['type'], speed: SectionEffect['speed'] = 'normal', intensity: SectionEffect['intensity'] = 'strong') {
    return args([storySection('story-effect', { effect: { type, speed, intensity } })]);
}

export function textAnimationStoryArgs(animation: TextAnimation) {
    return args([storySection('story-text', {})], animation);
}

export function transitionStoryArgs(assetId: 'story-art' | 'story-art-phone', edge: 'top' | 'bottom') {
    const above = storySection('story-above', edge === 'bottom' ? { transition: { assetId, edge } } : {});
    const below = storySection('story-below', {
        background: { kind: 'color', color: '#efe7ec' },
        ...(edge === 'top' ? { transition: { assetId, edge } } : {}),
    });
    return args([above, below]);
}
