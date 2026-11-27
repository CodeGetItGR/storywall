import { isHostBlock } from '@/lib/feedEditing';
import { FEED_BLOCK_FALLBACK_STYLE } from '@/lib/feedThemeStyles';
import { type InvitationDocument, MAX_SECTIONS } from '@/lib/invitation/document';
import { createSection } from '@/lib/invitation/newSection';
import { type PhotoFrameElement, resolveFrameArt } from '@/lib/invitation/photoFrame';
import type { RenderContext } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { SectionStyle } from '@/lib/invitation/sectionStyle';
import type { ThemeSwitchTarget } from '@/lib/invitation/themeSwitch';

// The theme's framed photo on the feed (KAN-292): one section with one frame, which comes with a theme that has photo
// frames. The host puts a photo in it and may move or hide it, never add or delete it.

// How the theme shows its main frame.
type ThemeFrame = Pick<PhotoFrameElement, 'frameId' | 'boxScale' | 'animation'> & { style: SectionStyle };

type ThemeFrameSource = Pick<ThemeSwitchTarget, 'document' | 'theme'>;

// The theme's main frame: the one in its framed photo section, else in its top, else its first; null without frames.
export function themeFrame({ document, theme }: ThemeFrameSource): ThemeFrame | null {
    const known = new Set(theme.frames.map((frame) => frame.id));
    const frames = document.sections.flatMap((section) =>
        section.elements.flatMap((element) => (element.kind === 'photoFrame' && known.has(element.frameId) ? [{ section, element }] : [])),
    );
    const main = frames.find(({ section }) => section.type === 'photoFrame') ?? frames.find(({ section }) => section.type === 'top') ?? frames[0];
    if (!main) {
        const first = theme.frames[0];
        return first ? { frameId: first.id, boxScale: 1, animation: 'none', style: FEED_BLOCK_FALLBACK_STYLE } : null;
    }
    const { frameId, boxScale, animation } = main.element;
    return { frameId, boxScale, animation, style: main.section.type === 'photoFrame' ? main.section.style : FEED_BLOCK_FALLBACK_STYLE };
}

function framedPhoto(frame: ThemeFrame): InvitationSection {
    const section = createSection('photoFrame', '');
    return inFrame({ ...section, style: frame.style } as InvitationSection, frame);
}

// The section in the theme's frame, with its photo where the host put it.
function inFrame(section: InvitationSection, { frameId, boxScale, animation }: ThemeFrame): InvitationSection {
    const elements = section.elements.map((element) => (element.kind === 'photoFrame' ? { ...element, frameId, boxScale, animation } : element));
    return { ...section, elements } as InvitationSection;
}

// The theme's own sections for the switch to restyle after: its framed photo as the feed draws it, its frame alone.
export function themeFrameTemplate(source: ThemeFrameSource): InvitationSection[] {
    const frame = themeFrame(source);
    const sections = source.document.sections.filter((section) => section.type !== 'photoFrame');
    return frame ? [...sections, framedPhoto(frame)] : sections;
}

// The layout's framed photo in the theme's frame. A layout with none gets an empty one, first among the host's blocks.
export function withThemeFrame(layout: InvitationDocument, source: ThemeFrameSource): InvitationDocument {
    const frame = themeFrame(source);
    if (!frame) return layout;
    const sections = layout.sections.map((section) => (section.type === 'photoFrame' ? inFrame(section, frame) : section));
    const held = sections.some((section) => section.type === 'photoFrame');
    if (held || sections.length >= MAX_SECTIONS) return { ...layout, sections };
    const first = sections.findIndex((section) => isHostBlock(section, { rsvpMoves: true }));
    const added = framedPhoto(frame);
    const onPage = { ...added, style: { ...added.style, background: FEED_BLOCK_FALLBACK_STYLE.background } } as InvitationSection;
    sections.splice(first === -1 ? sections.length : first, 0, onPage);
    return { ...layout, sections };
}

// A framed photo on a theme without its frame's art: nothing to draw, for the host editing either.
export function lacksThemeFrame(section: InvitationSection, ctx: RenderContext): boolean {
    if (section.type !== 'photoFrame') return false;
    return section.elements.every((element) => element.kind !== 'photoFrame' || resolveFrameArt(element, ctx) === null);
}
