import type { InvitationDocument } from '@/lib/invitation/document';
import type { SampleSections } from '@/lib/invitation/eventLinks';
import { isEmptyForGuests } from '@/lib/invitation/gallery';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import { createSection, type NewSectionType } from '@/lib/invitation/newSection';
import { buildRenderContext, type MediaResolver, type RenderContext } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { type InvitationFontDto, uploadedFontFaceCss } from '@/lib/invitation/uploadedFonts';

// placeholder: a gallery with no photos to draw, shown as empty tiles instead.
export type FeedSectionPreview = { type: NewSectionType; section: InvitationSection; placeholder: boolean };
export type FeedSectionPreviews = { items: FeedSectionPreview[]; ctx: RenderContext; lang: string; fontFaces: string };

// A section drawn as a still picture: no background effect, no transition art, no looping photo frames.
export function stillSection(section: InvitationSection): InvitationSection {
    const still = { ...section, style: { ...section.style, effect: undefined, transition: undefined } };
    if (!('elements' in still) || !Array.isArray(still.elements)) return still as InvitationSection;
    const elements = still.elements.map((element) => (element.kind === 'photoFrame' ? { ...element, animation: 'none' } : element));
    return { ...still, elements } as InvitationSection;
}

// One Add section card's picture: the theme's own sample of that type (its look and sample content), else a
// new section, still.
export function feedSectionPreview(type: NewSectionType, samples: SampleSections | null, eventType: string): InvitationSection {
    const sample = samples ? [...samples.values()].find((section) => section.type === type) : undefined;
    const section = sample ?? createSection(type, eventType);
    return stillSection({ ...section, id: `preview-${type}`, visible: true } as InvitationSection);
}

// A gallery with no photos draws nothing (as guests see it), so its card shows empty tiles instead.
export function feedPreviewNeedsPlaceholder(section: InvitationSection, ctx: RenderContext): boolean {
    return section.type === 'gallery' && isEmptyForGuests(section, ctx);
}

type FeedSectionPreviewsInput = {
    types: NewSectionType[];
    document: InvitationDocument;
    theme: ThemeDesign;
    media: MediaResolver;
    eventType: string;
    samples: { sections: SampleSections; imageUrls: Readonly<Record<string, string>> } | null;
    fonts: InvitationFontDto[];
    locale: string;
};

// Every Add section card's picture, drawn in the given theme with no text animation, and the uploaded fonts
// the pictures name (the layout's, the theme's and the samples' own).
export function buildFeedSectionPreviews({
    types,
    document,
    theme,
    media,
    eventType,
    samples,
    fonts,
    locale,
}: FeedSectionPreviewsInput): FeedSectionPreviews {
    const sampleMedia: MediaResolver = (mediaId) => samples?.imageUrls[mediaId] ?? media(mediaId);
    const ctx: RenderContext = {
        ...buildRenderContext(document, { ...theme, textAnimation: 'none' }, sampleMedia),
        labels: INVITATION_LABELS[locale === 'en' ? 'en' : 'el'],
    };
    const items = types.map((type) => {
        const section = feedSectionPreview(type, samples?.sections ?? null, eventType);
        return { type, section, placeholder: feedPreviewNeedsPlaceholder(section, ctx) };
    });
    const fontFaces = uploadedFontFaceCss(fonts, [document, theme, items.map((item) => item.section)]);
    return { items, ctx, lang: locale, fontFaces };
}
