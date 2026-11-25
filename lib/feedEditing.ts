import type { Draft } from 'immer';

import type { EventModuleResponseDto } from '@/lib/api/types';
import { feedAddList } from '@/lib/feedAddList';
import { type FeedFrame, feedFrame } from '@/lib/feedLayout';
import type { FeedPageMode } from '@/lib/feedMode';
import { hasFeedSection } from '@/lib/feedSections';
import { type InvitationDocument, MAX_SECTIONS } from '@/lib/invitation/document';
import type { NewSectionType } from '@/lib/invitation/newSection';
import { deleteSection, type MoveDirection, setSectionVisible } from '@/lib/invitation/sectionActions';
import {
    FEED_MODE_SECTION_TYPES,
    type FeedModeSectionType,
    type InvitationSection,
    isFeedModeSectionType,
    isFeedSectionType,
    type SectionType,
} from '@/lib/invitation/sections';
import type { SettingsGroup } from '@/lib/invitation/sectionSettings';
import type { SettingsPart } from '@/lib/settingsPreview';

// Edit mode on the feed (KAN-245). The cover and details keep their places, RSVP too without Save my date; the host
// orders, hides and deletes the rest, and Feed mode's sections among themselves.
// Every edit is an Immer recipe for the old editor's store.

// What edit mode may change. all: with Save my date. feedSections: without it, only Feed mode's sections; the fixed
// blocks, the invitation's sections, themes and the background are out of reach.
export type FeedEditScope = 'all' | 'feedSections';

type DocumentDraft = Draft<InvitationDocument>;
type Block = Pick<InvitationSection, 'id' | 'type' | 'locked'>;

// rsvpMoves: the event has Save my date, so RSVP is one of the host's blocks.
export type HostBlockOptions = { rsvpMoves: boolean };

// The description, every Save my date block, and RSVP with Save my date: what the host orders.
export function isHostBlock(section: Pick<InvitationSection, 'type'>, { rsvpMoves }: HostBlockOptions): boolean {
    return (
        section.type === 'feedDescription' ||
        (!isFeedSectionType(section.type) && !isFeedModeSectionType(section.type)) ||
        (rsvpMoves && section.type === 'feedRsvp')
    );
}

// One of Feed mode's sections: what the host orders under the stories.
export function isFeedModeBlock(section: Pick<InvitationSection, 'type'>): boolean {
    return isFeedModeSectionType(section.type);
}

type BlockGroup = (section: Pick<InvitationSection, 'type'>) => boolean;

// The blocks a block moves among: the host blocks, or Feed mode's sections. The frame's fixed blocks move nowhere.
function groupOf(section: Pick<InvitationSection, 'type'> | undefined, options: HostBlockOptions): BlockGroup | null {
    if (!section) return null;
    if (isHostBlock(section, options)) return (item) => isHostBlock(item, options);
    return isFeedModeBlock(section) ? isFeedModeBlock : null;
}

// Edit mode lists every block, hidden ones too, and the middle is never dropped after the event.
export function feedEditFrame(layout: InvitationDocument, options: HostBlockOptions): FeedFrame {
    const find = (type: SectionType) => layout.sections.find((section) => section.type === type) ?? null;
    return {
        cover: feedFrame(layout, { ended: false }).cover,
        middle: layout.sections.filter((section) => isHostBlock(section, options)),
        rsvp: options.rsvpMoves ? null : find('feedRsvp'),
        feed: layout.sections.filter(isFeedModeBlock),
    };
}

// What drags on screen, in order: only the blocks the mode draws, so the place read out while dragging counts those.
export function draggableFeedBlocks({ middle, feed }: Pick<FeedFrame, 'middle' | 'feed'>, mode: FeedPageMode): InvitationSection[] {
    if (mode === 'invitation') return middle;
    return mode === 'feed' ? feed : [...middle, ...feed];
}

export function canHideFeedBlock(section: Block): boolean {
    return section.type !== 'feedCover' && !section.locked;
}

// A Save my date, module or Feed mode block, and RSVP when it moves (spec item 17). Never the cover, details,
// description or the theme's framed photo, which the host only hides (KAN-292).
export function canDeleteFeedBlock(section: Block, { rsvpMoves }: HostBlockOptions): boolean {
    if (section.locked) return false;
    if (section.type === 'feedRsvp') return rsvpMoves;
    return section.type !== 'photoFrame' && !isFeedSectionType(section.type);
}

// A locked block keeps its place: it never moves, and nothing moves into it.
export function canMoveFeedBlock(sections: readonly Block[], id: string, direction: MoveDirection, options: HostBlockOptions): boolean {
    const section = sections.find((item) => item.id === id);
    const group = groupOf(section, options);
    if (!section || !group) return false;
    const members = sections.filter(group);
    const target = members[members.indexOf(section) + direction];
    return !section.locked && target !== undefined && !target.locked;
}

export type FeedBlockControls = { canHide: boolean; canDelete: boolean; movable: boolean; canMoveUp: boolean; canMoveDown: boolean };

export function feedBlockControls(sections: readonly Block[], section: Block, options: HostBlockOptions): FeedBlockControls {
    const movable = groupOf(section, options) !== null && !section.locked;
    return {
        canHide: canHideFeedBlock(section),
        canDelete: canDeleteFeedBlock(section, options),
        movable,
        canMoveUp: movable && canMoveFeedBlock(sections, section.id, -1, options),
        canMoveDown: movable && canMoveFeedBlock(sections, section.id, 1, options),
    };
}

// The dragged block takes the place of the one it was dropped on, both in the same group. Every other block stays
// where it is, so only that group's own slots are rewritten. A drag onto another group, or one that would shift a
// locked block, does nothing.
export function reorderFeedBlocks(activeId: string, overId: string, options: HostBlockOptions) {
    return (draft: DocumentDraft) => {
        const group = groupOf(
            draft.sections.find((section) => section.id === activeId),
            options,
        );
        if (!group) return;
        const slots = draft.sections.flatMap((section, index) => (group(section) ? [index] : []));
        const members = slots.map((slot) => draft.sections[slot]);
        const from = members.findIndex((section) => section.id === activeId);
        const to = members.findIndex((section) => section.id === overId);
        if (from === -1 || to === -1 || from === to) return;
        const [moved] = members.splice(from, 1);
        members.splice(to, 0, moved);
        if (members.some((section, place) => section.locked && draft.sections[slots[place]].id !== section.id)) return;
        slots.forEach((slot, place) => {
            draft.sections[slot] = members[place];
        });
    };
}

export function moveFeedBlock(id: string, direction: MoveDirection, options: HostBlockOptions) {
    return (draft: DocumentDraft) => {
        const section = draft.sections.find((item) => item.id === id);
        const group = groupOf(section, options);
        if (!section || !group) return;
        const members = draft.sections.filter(group);
        const target = members[members.findIndex((item) => item.id === id) + direction];
        if (target) reorderFeedBlocks(id, target.id, options)(draft);
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
// A feed section goes last: the frame places it, so where it sits among the other blocks doesn't matter.
export function appendFeedSection(section: InvitationSection, options: HostBlockOptions) {
    return (draft: DocumentDraft) => {
        if (draft.sections.length >= MAX_SECTIONS) return;
        if (isFeedModeBlock(section)) {
            draft.sections.push(section as Draft<InvitationSection>);
            return;
        }
        const lastMiddle = draft.sections.map((item) => isHostBlock(item, options)).lastIndexOf(true);
        const rsvp = draft.sections.findIndex((item) => item.type === 'feedRsvp');
        const index = lastMiddle !== -1 ? lastMiddle + 1 : rsvp !== -1 ? rsvp : draft.sections.length;
        draft.sections.splice(index, 0, section as Draft<InvitationSection>);
    };
}

// What the Add section sheet lists: invitation sections, or Feed mode's own.
export type FeedAddKind = 'invitation' | 'feed';

// Where a "+ Add section" row puts its block: after a host block, or null (no host blocks yet), which is where
// appendFeedSection puts it.
export type FeedAddPlace = { after: string } | null;

// A new block goes at the row it was asked from (spec item 8; none above the first, owner 2026-11-24). A place whose
// block was deleted meanwhile falls back to appendFeedSection.
export function insertFeedSection(section: InvitationSection, place: FeedAddPlace, options: HostBlockOptions) {
    return (draft: DocumentDraft) => {
        if (draft.sections.length >= MAX_SECTIONS) return;
        const anchor = place ? draft.sections.findIndex((item) => item.id === place.after && isHostBlock(item, options)) : -1;
        if (anchor === -1 || isFeedModeBlock(section)) return appendFeedSection(section, options)(draft);
        draft.sections.splice(anchor + 1, 0, section as Draft<InvitationSection>);
    };
}

// The feed's Add section list (lib/feedAddList): the event type's own list, minus what is on the page or covered by
// a module the event has.
export function addableFeedSectionTypes(document: InvitationDocument, eventType: string, modules: readonly EventModuleResponseDto[]): NewSectionType[] {
    return feedAddList(document, eventType, modules);
}

// What the event offers the feed sections that need something of it.
// hasSchedule: a date and timed sessions. hasHeOrShe: the Boy or Girl module.
export type FeedModeAvailability = { hasSchedule: boolean; hasHeOrShe: boolean };

// The feed sections the host may add: each once; the schedule and Boy or Girl only when the event has what they draw.
export function addableFeedModeTypes(document: InvitationDocument, { hasSchedule, hasHeOrShe }: FeedModeAvailability): FeedModeSectionType[] {
    if (document.sections.length >= MAX_SECTIONS) return [];
    return FEED_MODE_SECTION_TYPES.filter(
        (type) => (type !== 'feedSchedule' || hasSchedule) && (type !== 'feedHeOrShe' || hasHeOrShe) && !hasFeedSection(document.sections, type),
    );
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

// The feed shows how a section looks after everything else, so the date's group is two here. So is the
// gallery's: its photos, then its look.
const ON_FEED: Partial<Record<SettingsGroup, readonly SettingsGroup[]>> = {
    date: ['dateLanguage', 'dateLayout'],
    gallery: ['galleryPhotos', 'galleryLayout'],
};

export function feedSettingsGroups(groups: readonly SettingsGroup[]): SettingsGroup[] {
    return groups.filter((group) => !LEFT_OUT.includes(group)).flatMap((group) => ON_FEED[group] ?? [group]);
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
