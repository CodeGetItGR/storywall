import { newFeedBlock } from '@/lib/feedLayout';
import type { InvitationDocument } from '@/lib/invitation/document';
import { newSectionId } from '@/lib/invitation/newSection';
import type { FeedModuleKey, InvitationSection } from '@/lib/invitation/sections';
import { routes } from '@/lib/routes';

// A module the tiles stand for: RSVP (its own block) or a feed module block.
export type TileModuleKey = 'rsvp' | FeedModuleKey;

export function feedModuleSection(module: FeedModuleKey, newId: () => string = newSectionId): InvitationSection {
    return { ...newFeedBlock('feedRsvp'), id: newId(), type: 'feedModule', name: 'feedModule', data: { module } } as InvitationSection;
}

// The tool each module block's button opens.
const TOOL: Record<FeedModuleKey, (eventId: string) => string> = {
    wishbook: routes.events.tools.wishbook,
    playlist: routes.events.tools.playlist,
    he_or_she: routes.events.tools.heOrShe,
    quiz_polls: routes.events.tools.quiz,
    schedule: (eventId) => routes.events.tools.schedule(eventId),
    wishlist: routes.events.tools.gifts,
    gallery: routes.events.tools.gallery,
};

export function feedModuleToolHref(eventId: string, module: FeedModuleKey): string {
    return TOOL[module](eventId);
}

export function moduleOfBlock(section: Pick<InvitationSection, 'type' | 'data'>): FeedModuleKey | null {
    return section.type === 'feedModule' ? (section.data as { module: FeedModuleKey }).module : null;
}

// Whether the layout already holds the module's block, shown or hidden.
export function layoutHasModule(document: InvitationDocument, module: TileModuleKey): boolean {
    return document.sections.some((section) => (module === 'rsvp' ? section.type === 'feedRsvp' : moduleOfBlock(section) === module));
}
