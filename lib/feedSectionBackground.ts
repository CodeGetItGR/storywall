import type { Draft } from 'immer';

import type { InvitationDocument } from '@/lib/invitation/document';
import { type InvitationSection, isSaveMyDateSectionType } from '@/lib/invitation/sections';
import type { SectionStyle } from '@/lib/invitation/sectionStyle';

// A Save my date section's own background on the feed (KAN-269): one colour or one uploaded photo, held in its
// style.background like the rest of its look. Without one it shows the feed's background.

type Background = SectionStyle['background'];

const FEED_BACKGROUND: Background = { kind: 'theme', slot: 'auto' };

export function canHaveBackground(section: Pick<InvitationSection, 'type' | 'locked'>): boolean {
    return isSaveMyDateSectionType(section.type) && !section.locked;
}

export function sectionColor({ style }: Pick<InvitationSection, 'style'>): string | undefined {
    return style.background.kind === 'color' ? style.background.color : undefined;
}

// The photo's media id. A theme's own image is never the host's pick.
export function sectionPhoto({ style }: Pick<InvitationSection, 'style'>): string | undefined {
    const { background } = style;
    return background.kind === 'image' && background.image.source === 'media' ? background.image.mediaId : undefined;
}

function setBackground(sectionId: string, background: Background) {
    return (draft: Draft<InvitationDocument>) => {
        const section = draft.sections.find((item) => item.id === sectionId);
        if (section && canHaveBackground(section as InvitationSection)) section.style.background = background;
    };
}

// undefined: back to the feed's background.
export function setSectionColor(sectionId: string, color: string | undefined) {
    return setBackground(sectionId, color === undefined ? FEED_BACKGROUND : { kind: 'color', color });
}

export function setSectionPhoto(sectionId: string, mediaId: string | undefined) {
    return setBackground(sectionId, mediaId === undefined ? FEED_BACKGROUND : { kind: 'image', image: { source: 'media', mediaId } });
}

// The host's own pick, which stays with its section through a theme change; null for anything a theme brought.
export function ownSectionBackground(section: InvitationSection, themeImageIds: ReadonlySet<string>): Background | null {
    if (!isSaveMyDateSectionType(section.type)) return null;
    if (sectionColor(section) !== undefined) return section.style.background;
    const photo = sectionPhoto(section);
    return photo !== undefined && !themeImageIds.has(photo) ? section.style.background : null;
}
