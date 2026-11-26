import type { EventDetailResponseDto, FeedLayoutDto } from '@/lib/api/types';
import { isEventEnded, isModuleAvailable } from '@/lib/eventLifecycle';
import { newFeedBlock, readFeedLayout } from '@/lib/feedLayout';
import type { InvitationDocument } from '@/lib/invitation/document';
import { newSectionId } from '@/lib/invitation/newSection';
import type { FeedModuleKey, InvitationSection } from '@/lib/invitation/sections';
import { routes } from '@/lib/routes';
import { SAVE_MY_DATE_MODULE_KEY } from '@/lib/saveMyDateRelease';

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

// The Schedule tool on its edit view, for the hosts' card on a schedule with no sessions.
export function feedScheduleEditorHref(eventId: string): string {
    return routes.events.tools.schedule(eventId, { section: 'schedule' });
}

export function moduleOfBlock(section: Pick<InvitationSection, 'type' | 'data'>): FeedModuleKey | null {
    return section.type === 'feedModule' ? (section.data as { module: FeedModuleKey }).module : null;
}

// Whether the layout already holds the module's block, shown or hidden.
export function layoutHasModule(document: InvitationDocument, module: TileModuleKey): boolean {
    return document.sections.some((section) => (module === 'rsvp' ? section.type === 'feedRsvp' : moduleOfBlock(section) === module));
}

// Whether the member feed draws the module's block from this saved layout, as useFeedTop decides: module blocks need
// Save my date and an event that hasn't ended, and a shown block. For the feed page's server prefetch.
export function feedLayoutDrawsModule(
    dto: FeedLayoutDto | null,
    event: Pick<EventDetailResponseDto, 'modules' | 'schedule'>,
    module: FeedModuleKey,
): boolean {
    if (!isModuleAvailable(event.modules, SAVE_MY_DATE_MODULE_KEY) || isEventEnded(event)) return false;
    return readFeedLayout(dto, null).document.sections.some((section) => section.visible && moduleOfBlock(section) === module);
}
