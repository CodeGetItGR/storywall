import type { Draft } from 'immer';

import type { EventModuleResponseDto } from '@/lib/api/types';
import { feedAddList } from '@/lib/feedAddList';
import { type FeedFrame, feedFrame } from '@/lib/feedLayout';
import { type InvitationDocument, MAX_SECTIONS } from '@/lib/invitation/document';
import type { NewSectionType } from '@/lib/invitation/newSection';
import { deleteSection, type MoveDirection, setSectionVisible } from '@/lib/invitation/sectionActions';
import { type InvitationSection, isFeedSectionType, type SectionType } from '@/lib/invitation/sections';
import type { SettingsGroup } from '@/lib/invitation/sectionSettings';
import type { SettingsPart } from '@/lib/settingsPreview';

// Edit mode on the feed (KAN-245). The cover and details keep their places, RSVP too without Save my date; the host
// orders, hides and deletes the rest.
// Every edit is an Immer recipe for the old editor's store.

type DocumentDraft = Draft<InvitationDocument>;
type Block = Pick<InvitationSection, 'id' | 'type' | 'locked'>;

// rsvpMoves: the event has Save my date, so RSVP is one of the host's blocks.
export type HostBlockOptions = { rsvpMoves: boolean };

// The description, every Save my date block, and RSVP with Save my date: what the host orders.
export function isHostBlock(section: Pick<InvitationSection, 'type'>, { rsvpMoves }: HostBlockOptions): boolean {
    return section.type === 'feedDescription' || !isFeedSectionType(section.type) || (rsvpMoves && section.type === 'feedRsvp');
}

// Edit mode lists every block, hidden ones too, and the middle is never dropped after the event.
export function feedEditFrame(layout: InvitationDocument, options: HostBlockOptions): FeedFrame {
    const find = (type: SectionType) => layout.sections.find((section) => section.type === type) ?? null;
    return {
        cover: feedFrame(layout, { ended: false }).cover,
        middle: layout.sections.filter((section) => isHostBlock(section, options)),
        rsvp: options.rsvpMoves ? null : find('feedRsvp'),
    };
}

export function canHideFeedBlock(section: Block): boolean {
    return section.type !== 'feedCover' && !section.locked;
}

// A Save my date or module block, and RSVP when it moves (spec item 17). Never the cover, details or description.
export function canDeleteFeedBlock(section: Block, { rsvpMoves }: HostBlockOptions): boolean {
    if (section.locked) return false;
    if (section.type === 'feedRsvp') return rsvpMoves;
    return !isFeedSectionType(section.type);
}

function middleIds(sections: readonly Block[], options: HostBlockOptions): string[] {
    return sections.filter((section) => isHostBlock(section, options)).map((section) => section.id);
}

// A locked block keeps its place: it never moves, and nothing moves into it.
export function canMoveFeedBlock(sections: readonly Block[], id: string, direction: MoveDirection, options: HostBlockOptions): boolean {
    const middle = sections.filter((section) => isHostBlock(section, options));
    const index = middle.findIndex((section) => section.id === id);
    const target = index === -1 ? undefined : middle[index + direction];
    return index !== -1 && !middle[index].locked && target !== undefined && !target.locked;
}

export type FeedBlockControls = { canHide: boolean; canDelete: boolean; movable: boolean; canMoveUp: boolean; canMoveDown: boolean };

export function feedBlockControls(sections: readonly Block[], section: Block, options: HostBlockOptions): FeedBlockControls {
    const movable = isHostBlock(section, options) && !section.locked;
    return {
        canHide: canHideFeedBlock(section),
        canDelete: canDeleteFeedBlock(section, options),
        movable,
        canMoveUp: movable && canMoveFeedBlock(sections, section.id, -1, options),
        canMoveDown: movable && canMoveFeedBlock(sections, section.id, 1, options),
    };
}

// The dragged block takes the place of the one it was dropped on. The frame's fixed blocks stay where they are, so
// only the host blocks' own slots are rewritten. A drag that would shift a locked block does nothing.
export function reorderFeedBlocks(activeId: string, overId: string, options: HostBlockOptions) {
    return (draft: DocumentDraft) => {
        const slots = draft.sections.flatMap((section, index) => (isHostBlock(section, options) ? [index] : []));
        const middle = slots.map((slot) => draft.sections[slot]);
        const from = middle.findIndex((section) => section.id === activeId);
        const to = middle.findIndex((section) => section.id === overId);
        if (from === -1 || to === -1 || from === to) return;
        const [moved] = middle.splice(from, 1);
        middle.splice(to, 0, moved);
        if (middle.some((section, place) => section.locked && draft.sections[slots[place]].id !== section.id)) return;
        slots.forEach((slot, place) => {
            draft.sections[slot] = middle[place];
        });
    };
}

export function moveFeedBlock(id: string, direction: MoveDirection, options: HostBlockOptions) {
    return (draft: DocumentDraft) => {
        const order = middleIds(draft.sections, options);
        const index = order.indexOf(id);
        const target = index === -1 ? undefined : order[index + direction];
        if (target !== undefined) reorderFeedBlocks(id, target, options)(draft);
    };
}

export function setFeedBlockVisible(id: string, visible: boolean) {
    return (draft: DocumentDraft) => {
        const section = draft.sections.find((item) => item.id === id);
        if (section && canHideFeedBlock(section)) setSectionVisible(id, visible)(draft);
    };
}

export function deleteFeedBlock(id: string, options: HostBlockOptions) {
    return (draft: DocumentDraft) => {
        const section = draft.sections.find((item) => item.id === id);
        if (section && canDeleteFeedBlock(section, options)) deleteSection(id)(draft);
    };
}

// A new block goes after the last host block: before RSVP when RSVP keeps its fixed place, after it when it moves.
export function appendFeedSection(section: InvitationSection, options: HostBlockOptions) {
    return (draft: DocumentDraft) => {
        if (draft.sections.length >= MAX_SECTIONS) return;
        const lastMiddle = draft.sections.map((item) => isHostBlock(item, options)).lastIndexOf(true);
        const rsvp = draft.sections.findIndex((item) => item.type === 'feedRsvp');
        const index = lastMiddle !== -1 ? lastMiddle + 1 : rsvp !== -1 ? rsvp : draft.sections.length;
        draft.sections.splice(index, 0, section as Draft<InvitationSection>);
    };
}

// Where a "+ Add section" row puts its block: after a host block, before the first one (the row above the first), or
// null (no host blocks yet), which is where appendFeedSection puts it.
export type FeedAddPlace = { after: string } | { before: string } | null;

// A new block goes at the row it was asked from (spec item 8; owner 2026-11-23: also above the first). A place whose
// block was deleted meanwhile falls back to appendFeedSection.
export function insertFeedSection(section: InvitationSection, place: FeedAddPlace, options: HostBlockOptions) {
    return (draft: DocumentDraft) => {
        if (draft.sections.length >= MAX_SECTIONS) return;
        const anchorId = place ? ('after' in place ? place.after : place.before) : null;
        const anchor = anchorId ? draft.sections.findIndex((item) => item.id === anchorId && isHostBlock(item, options)) : -1;
        if (anchor === -1) return appendFeedSection(section, options)(draft);
        const at = place && 'after' in place ? anchor + 1 : anchor;
        draft.sections.splice(at, 0, section as Draft<InvitationSection>);
    };
}

// An invitation section on the feed: not one of the feed's own blocks, not a module block.
export function isSaveMyDateBlock(section: Pick<InvitationSection, 'type'>): boolean {
    return !isFeedSectionType(section.type) && section.type !== 'feedModule';
}

// The feed's Add section list (lib/feedAddList): the event type's own list, minus what is on the page or covered by
// a module the event has.
export function addableFeedSectionTypes(document: InvitationDocument, eventType: string, modules: readonly EventModuleResponseDto[]): NewSectionType[] {
    return feedAddList(document, eventType, modules);
}

// The event's own fields each feed block shows, edited on the event as the Settings page does.
const FEED_BLOCK_PARTS: Partial<Record<SectionType, SettingsPart[]>> = {
    feedCover: ['cover', 'title'],
    feedDetails: ['date', 'location'],
    feedDescription: ['description'],
};

export function feedBlockParts(type: SectionType, available: readonly SettingsPart[]): SettingsPart[] {
    return (FEED_BLOCK_PARTS[type] ?? []).filter((part) => available.includes(part));
}

// The feed has one page background, and no theme to follow. Photos come from the feed's uploads (plan 7b).
const LEFT_OUT: readonly SettingsGroup[] = ['follow', 'background'];

export function feedSettingsGroups(groups: readonly SettingsGroup[]): SettingsGroup[] {
    return groups.filter((group) => !LEFT_OUT.includes(group));
}

// What keeps its own job when tapped inside a block: anything the host presses or types in,
// the Save my date text typed in place, and the block's tools (data-feed-block-tools, the cover's Cancel and Save too).
const OWN_TAP =
    'button, a, input, textarea, select, label, summary, [role="button"], [contenteditable="true"], [data-smd-text], [data-feed-block-tools]';

// In edit mode a tap anywhere else on a block opens its settings. A tap from outside the block
// (its menu is drawn elsewhere on the page, though React passes the click up through the block) does not.
export function opensBlockSettings(target: EventTarget | null, block: Element): boolean {
    if (!(target instanceof Element) || !block.contains(target)) return false;
    const own = target.closest(OWN_TAP);
    return own === null || !block.contains(own);
}
