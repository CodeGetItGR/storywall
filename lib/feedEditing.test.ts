import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import type { EventModuleResponseDto } from '@/lib/api/types';
import { feedAddList } from '@/lib/feedAddList';
import {
    addableFeedModeTypes,
    addableFeedSectionTypes,
    appendFeedSection,
    canDeleteFeedBlock,
    canHideFeedBlock,
    canMoveFeedBlock,
    deleteFeedBlock,
    draggableFeedBlocks,
    feedBlockControls,
    feedBlockParts,
    feedEditFrame,
    feedSettingsGroups,
    insertFeedSection,
    isHostBlock,
    moveFeedBlock,
    opensBlockSettings,
    reorderFeedBlocks,
    setFeedBlockVisible,
} from '@/lib/feedEditing';
import { defaultFeedLayout } from '@/lib/feedLayout';
import type { FeedPageMode } from '@/lib/feedMode';
import { feedModuleSection } from '@/lib/feedModuleBlocks';
import { createFeedModeSection } from '@/lib/feedSections';
import type { InvitationDocument } from '@/lib/invitation/document';
import { MAX_SECTIONS } from '@/lib/invitation/document';
import { createSection } from '@/lib/invitation/newSection';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import { type InvitationSection, isSaveMyDateSectionType } from '@/lib/invitation/sections';

// Without Save my date: RSVP keeps its fixed place.
const OFF = { rsvpMoves: false };

const dressCode = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };
const faq = { ...(SAMPLE_SECTIONS.faq as InvitationSection), id: 'faq' };
const lockedFaq = { ...faq, locked: true };

// cover, details, description, rsvp, then the Save my date blocks the host added.
function layout(...extra: InvitationSection[]): InvitationDocument {
    const base = defaultFeedLayout();
    return { ...base, sections: [...base.sections, ...extra] };
}

const ids = (document: InvitationDocument) => document.sections.map((section) => section.id);

describe('draggableFeedBlocks', () => {
    it('holds only what the mode draws', () => {
        const prompt = createFeedModeSection('feedPrompt', () => 'prompt');
        const frame = feedEditFrame(layout(dressCode, prompt), { rsvpMoves: true });
        const idsIn = (mode: FeedPageMode) => draggableFeedBlocks(frame, mode).map((section) => section.id);
        expect(idsIn('invitation')).toEqual(['feed-feedDescription', 'feed-feedRsvp', 'dress']);
        expect(idsIn('feed')).toEqual(['prompt']);
        expect(idsIn('single')).toEqual(['feed-feedDescription', 'feed-feedRsvp', 'dress', 'prompt']);
    });
});

describe('feedEditFrame', () => {
    it('lists every block, hidden ones too', () => {
        const hidden = produce(layout(dressCode), (draft) => {
            draft.sections[1].visible = false;
            draft.sections[4].visible = false;
        });
        const frame = feedEditFrame(hidden, OFF);
        expect(frame.cover.type).toBe('feedCover');
        expect(frame.middle.map((section) => section.id)).toEqual(['feed-feedDescription', 'dress']);
        expect(frame.rsvp?.type).toBe('feedRsvp');
    });
});

describe('which block may do what', () => {
    const [cover, details, description, rsvp] = defaultFeedLayout().sections;

    it('hides every block but the cover', () => {
        expect(canHideFeedBlock(cover)).toBe(false);
        expect([details, description, rsvp, dressCode].every(canHideFeedBlock)).toBe(true);
    });

    it('deletes only Save my date blocks without Save my date', () => {
        expect([cover, details, description, rsvp].some((section) => canDeleteFeedBlock(section, OFF))).toBe(false);
        expect(canDeleteFeedBlock(dressCode, OFF)).toBe(true);
    });

    it("hides and moves the theme's framed photo, never deletes it", () => {
        const framed = createSection('photoFrame', 'WEDDING');
        const on = { rsvpMoves: true };
        expect(feedBlockControls(layout(framed).sections, framed, on)).toMatchObject({ canHide: true, canDelete: false, movable: true });
        expect(produce(layout(framed), deleteFeedBlock(framed.id, on)).sections).toHaveLength(layout(framed).sections.length);
    });

    it('moves only middle blocks, and only among themselves', () => {
        const sections = layout(dressCode).sections;
        expect(isHostBlock(description, OFF)).toBe(true);
        expect(isHostBlock(rsvp, OFF)).toBe(false);
        expect(canMoveFeedBlock(sections, 'feed-feedDescription', -1, OFF)).toBe(false);
        expect(canMoveFeedBlock(sections, 'feed-feedDescription', 1, OFF)).toBe(true);
        expect(canMoveFeedBlock(sections, 'dress', 1, OFF)).toBe(false);
        expect(canMoveFeedBlock(sections, 'feed-feedRsvp', -1, OFF)).toBe(false);
    });

    it('never moves a locked block, nor another block into its place', () => {
        const sections = layout(dressCode, lockedFaq).sections;
        expect(canMoveFeedBlock(sections, 'faq', -1, OFF)).toBe(false);
        expect(canMoveFeedBlock(sections, 'dress', 1, OFF)).toBe(false);
        expect(canMoveFeedBlock(sections, 'dress', -1, OFF)).toBe(true);
        expect(feedBlockControls(sections, lockedFaq, OFF)).toEqual({ canHide: false, canDelete: false, movable: false, canMoveUp: false, canMoveDown: false });
    });

    it('tells a Save my date block from the feed blocks and module blocks', () => {
        expect(isSaveMyDateSectionType(dressCode.type)).toBe(true);
        expect([cover, details, description, rsvp, feedModuleSection('playlist', () => 'm')].some((section) => isSaveMyDateSectionType(section.type))).toBe(false);
    });

    it('sums it up per block', () => {
        const sections = layout(dressCode).sections;
        expect(feedBlockControls(sections, cover, OFF)).toEqual({ canHide: false, canDelete: false, movable: false, canMoveUp: false, canMoveDown: false });
        expect(feedBlockControls(sections, dressCode, OFF)).toEqual({ canHide: true, canDelete: true, movable: true, canMoveUp: true, canMoveDown: false });
    });
});

describe('edits', () => {
    it('moves a middle block past its middle neighbour and leaves the frame in place', () => {
        const next = produce(layout(dressCode, faq), moveFeedBlock('faq', -1, OFF));
        expect(ids(next)).toEqual(['feed-feedCover', 'feed-feedDetails', 'feed-feedDescription', 'feed-feedRsvp', 'faq', 'dress']);
    });

    it('leaves the document alone when a block cannot move further', () => {
        const start = layout(dressCode, faq);
        expect(produce(start, moveFeedBlock('feed-feedDescription', -1, OFF))).toBe(start);
        expect(produce(start, moveFeedBlock('faq', 1, OFF))).toBe(start);
    });

    it('appends right before RSVP when there is no middle block', () => {
        const start = produce(layout(), (draft) => {
            draft.sections.splice(2, 1);
        });
        const next = produce(start, appendFeedSection(faq, OFF));
        expect(ids(next)).toEqual(['feed-feedCover', 'feed-feedDetails', 'faq', 'feed-feedRsvp']);
    });

    it('appends nothing at the section limit', () => {
        const start = produce(layout(), (draft) => {
            while (draft.sections.length < MAX_SECTIONS) draft.sections.push({ ...faq, id: `x${draft.sections.length}` });
        });
        expect(produce(start, appendFeedSection(faq, OFF))).toBe(start);
    });

    it('drags among middle blocks only', () => {
        const next = produce(layout(dressCode, faq), reorderFeedBlocks('faq', 'feed-feedDescription', OFF));
        expect(next.sections.filter((section) => isHostBlock(section, OFF)).map((section) => section.id)).toEqual(['faq', 'feed-feedDescription', 'dress']);
        expect(next.sections[0].id).toBe('feed-feedCover');
        expect(next.sections[1].id).toBe('feed-feedDetails');
    });

    it('keeps a locked block in its place when dragging', () => {
        const start = layout(dressCode, lockedFaq);
        expect(produce(start, reorderFeedBlocks('faq', 'dress', OFF))).toBe(start);
        expect(produce(start, reorderFeedBlocks('feed-feedDescription', 'faq', OFF))).toBe(start);
        expect(produce(start, moveFeedBlock('dress', 1, OFF))).toBe(start);
        const next = produce(layout(dressCode, faq, { ...lockedFaq, id: 'lockedFaq' }), reorderFeedBlocks('faq', 'feed-feedDescription', OFF));
        expect(next.sections.filter((section) => isHostBlock(section, OFF)).map((section) => section.id)).toEqual(['faq', 'feed-feedDescription', 'dress', 'lockedFaq']);
    });

    it('ignores a drop on a block outside the middle', () => {
        const start = layout(dressCode);
        expect(produce(start, reorderFeedBlocks('dress', 'feed-feedRsvp', OFF))).toBe(start);
    });

    it('never hides the cover', () => {
        const start = layout();
        expect(produce(start, setFeedBlockVisible('feed-feedCover', false))).toBe(start);
        expect(produce(start, setFeedBlockVisible('feed-feedRsvp', false)).sections[3].visible).toBe(false);
    });

    it('never deletes a feed block', () => {
        const start = layout(dressCode);
        expect(produce(start, deleteFeedBlock('feed-feedDescription', OFF))).toBe(start);
        expect(ids(produce(start, deleteFeedBlock('dress', OFF)))).not.toContain('dress');
    });

    it('appends after the last middle block', () => {
        const start = produce(layout(dressCode), (draft) => {
            // RSVP last, as a saved layout can order it.
            const [rsvp] = draft.sections.splice(3, 1);
            draft.sections.push(rsvp);
        });
        const next = produce(start, appendFeedSection(faq, OFF));
        expect(ids(next)).toEqual(['feed-feedCover', 'feed-feedDetails', 'feed-feedDescription', 'dress', 'faq', 'feed-feedRsvp']);
    });
});

describe('what the add row offers', () => {
    it("is the event type's Add section list", () => {
        const modules = [{ moduleKey: 'schedule', isAvailable: true } as EventModuleResponseDto];
        expect(addableFeedSectionTypes(layout(dressCode), 'WEDDING', modules)).toEqual(feedAddList(layout(dressCode), 'WEDDING', modules));
    });
});

describe('the pencil sheet', () => {
    it('maps each feed block to its event parts, among those the event has', () => {
        expect(feedBlockParts('feedCover', ['cover', 'title', 'date', 'location', 'description'])).toEqual(['cover', 'title']);
        expect(feedBlockParts('feedDetails', ['cover', 'title', 'description'])).toEqual([]);
        expect(feedBlockParts('feedDetails', ['cover', 'title', 'date', 'location', 'description'])).toEqual(['date', 'location']);
        expect(feedBlockParts('feedDescription', ['description'])).toEqual(['description']);
        expect(feedBlockParts('feedRsvp', ['cover', 'title', 'date', 'location', 'description'])).toEqual([]);
        expect(feedBlockParts('dressCode', ['cover'])).toEqual([]);
    });

    it("keeps the gallery's layout, and shows the date's language and layout apart", () => {
        expect(feedSettingsGroups(['gallery', 'follow', 'background', 'buttons'])).toEqual(['galleryPhotos', 'galleryLayout', 'buttons']);
        expect(feedSettingsGroups(['date'])).toEqual(['dateLanguage', 'dateLayout']);
    });
});

describe('a tap on a block', () => {
    function block(inner: string) {
        const node = document.createElement('div');
        node.innerHTML = inner;
        document.body.append(node);
        return node;
    }

    it('opens its settings when it lands on the block itself or its plain content', () => {
        const node = block('<div><p id="text">Hello</p></div>');
        expect(opensBlockSettings(node, node)).toBe(true);
        expect(opensBlockSettings(node.querySelector('#text'), node)).toBe(true);
        node.remove();
    });

    it("leaves the block's own controls, inline text and tools to do their own job", () => {
        const node = block(
            [
                '<button id="button"><svg id="icon"></svg></button>',
                '<a id="link" href="#">Link</a>',
                '<input id="input" />',
                '<textarea id="textarea"></textarea>',
                '<select id="select"></select>',
                '<label id="label">Label</label>',
                '<details><summary id="summary">More</summary></details>',
                '<span id="role" role="button">Tap</span>',
                '<p id="typing" contenteditable="true">Typing</p>',
                '<p data-smd-text="field:title"><span id="smd">Title</span></p>',
                '<div data-feed-block-tools><span id="tool">Name</span></div>',
            ].join(''),
        );
        for (const id of ['button', 'icon', 'link', 'input', 'textarea', 'select', 'label', 'summary', 'role', 'typing', 'smd', 'tool']) {
            expect(opensBlockSettings(node.querySelector(`#${id}`), node), id).toBe(false);
        }
        node.remove();
    });

    it('ignores a tap from outside the block, such as its menu drawn elsewhere on the page', () => {
        const node = block('<p>Hello</p>');
        const menu = block('<div role="menuitem" id="item">Move up</div>');
        expect(opensBlockSettings(menu.querySelector('#item'), node)).toBe(false);
        expect(opensBlockSettings(null, node)).toBe(false);
        node.remove();
        menu.remove();
    });

    it('still opens settings when the block itself sits inside a control', () => {
        const outer = block('<label><div id="inner"><p id="text">Hello</p></div></label>');
        const node = outer.querySelector('#inner') as HTMLElement;
        expect(opensBlockSettings(node.querySelector('#text'), node)).toBe(true);
        outer.remove();
    });
});

describe('RSVP as a host block', () => {
    const dress = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };
    const sections = [...defaultFeedLayout().sections, dress];

    it('moves and deletes only with Save my date', () => {
        const rsvp = sections.find((section) => section.type === 'feedRsvp')!;
        expect(feedBlockControls(sections, rsvp, { rsvpMoves: false })).toMatchObject({ movable: false, canDelete: false, canHide: true });
        expect(feedBlockControls(sections, rsvp, { rsvpMoves: true })).toMatchObject({ movable: true, canDelete: true, canHide: true, canMoveUp: true, canMoveDown: true });
    });

    it('reorders RSVP among the host blocks with Save my date', () => {
        const document = { ...defaultFeedLayout(), sections };
        const moved = produce(document, reorderFeedBlocks('feed-feedRsvp', 'feed-feedDescription', { rsvpMoves: true }));
        expect(moved.sections.filter((section) => isHostBlock(section, { rsvpMoves: true })).map((section) => section.id)).toEqual([
            'feed-feedRsvp',
            'feed-feedDescription',
            'dress',
        ]);
    });

    it('leaves RSVP where it is without Save my date', () => {
        const document = { ...defaultFeedLayout(), sections };
        const moved = produce(document, reorderFeedBlocks('feed-feedRsvp', 'feed-feedDescription', { rsvpMoves: false }));
        expect(moved).toEqual(document);
    });

    it('lists RSVP among the host blocks in edit mode with Save my date', () => {
        const document = { ...defaultFeedLayout(), sections };
        expect(feedEditFrame(document, { rsvpMoves: true }).middle.map((section) => section.id)).toEqual(['feed-feedDescription', 'feed-feedRsvp', 'dress']);
        expect(feedEditFrame(document, { rsvpMoves: true }).rsvp).toBeNull();
        expect(feedEditFrame(document, { rsvpMoves: false }).rsvp?.id).toBe('feed-feedRsvp');
    });
});

describe("RSVP's ✕", () => {
    const rsvp = defaultFeedLayout().sections.find((section) => section.type === 'feedRsvp')!;

    it('shows on Save my date events only', () => {
        expect(canDeleteFeedBlock(rsvp, { rsvpMoves: true })).toBe(true);
        expect(canDeleteFeedBlock(rsvp, { rsvpMoves: false })).toBe(false);
    });

    it('never on the cover, details or description', () => {
        for (const section of defaultFeedLayout().sections.filter((item) => item.type !== 'feedRsvp')) {
            expect(canDeleteFeedBlock(section, { rsvpMoves: true })).toBe(false);
        }
    });

    it('deletes RSVP when it moves', () => {
        const next = produce(defaultFeedLayout(), deleteFeedBlock(rsvp.id, { rsvpMoves: true }));
        expect(next.sections.some((section) => section.type === 'feedRsvp')).toBe(false);
    });
});

describe('insertFeedSection', () => {
    const options = { rsvpMoves: true };
    const dress = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };
    const faq = { ...(SAMPLE_SECTIONS.faq as InvitationSection), id: 'faq' };
    const layout: InvitationDocument = { ...defaultFeedLayout(), sections: [...defaultFeedLayout().sections, dress, faq] };
    const contact = () => createSection('contact', 'WEDDING', () => 'new');

    it('puts the new block right after the one it was asked from', () => {
        const next = produce(layout, insertFeedSection(contact(), { after: 'dress' }, options));
        const ids = next.sections.map((section) => section.id);
        expect(ids.indexOf('new')).toBe(ids.indexOf('dress') + 1);
    });

    it('appends when asked from nowhere', () => {
        const next = produce(layout, insertFeedSection(contact(), null, options));
        expect(next).toEqual(produce(layout, appendFeedSection(contact(), options)));
    });

    it('appends when the block it was asked from is gone', () => {
        const next = produce(layout, insertFeedSection(contact(), { after: 'missing' }, options));
        expect(next).toEqual(produce(layout, appendFeedSection(contact(), options)));
    });
});

describe('feed sections in edit mode', () => {
    const prompt = { ...SAMPLE_SECTIONS.feedPrompt, id: 'p' } as InvitationSection;
    const schedule = { ...SAMPLE_SECTIONS.feedSchedule, id: 's' } as InvitationSection;
    const page = layout(faq, prompt, schedule);
    const ON = { rsvpMoves: true };

    it('is never one of the host blocks of the middle', () => {
        expect([isHostBlock(prompt, OFF), isHostBlock(prompt, ON)]).toEqual([false, false]);
    });

    it.each([OFF, ON])('moves a feed section only among the feed sections (%o)', (options) => {
        expect(feedBlockControls(page.sections, prompt, options)).toEqual({ canHide: true, canDelete: true, movable: true, canMoveUp: false, canMoveDown: true });
        expect(feedBlockControls(page.sections, schedule, options)).toMatchObject({ canMoveUp: true, canMoveDown: false });
        const moved = produce(page, moveFeedBlock('p', 1, options));
        expect(ids(moved).slice(-2)).toEqual(['s', 'p']);
        expect(produce(page, moveFeedBlock('p', -1, options))).toBe(page);
        expect(produce(page, reorderFeedBlocks('p', 'faq', options))).toBe(page);
        expect(produce(page, reorderFeedBlocks('faq', 'p', options))).toBe(page);
    });

    it('leaves the blocks between two feed sections where they are', () => {
        const apart = layout(prompt, faq, schedule);
        expect(ids(produce(apart, reorderFeedBlocks('s', 'p', OFF))).slice(-3)).toEqual(['s', 'faq', 'p']);
        expect(feedBlockControls(apart.sections, faq, OFF)).toMatchObject({ canMoveUp: true, canMoveDown: false });
    });

    it('hides and deletes a feed section', () => {
        expect(produce(page, setFeedBlockVisible('p', false)).sections.find((section) => section.id === 'p')?.visible).toBe(false);
        expect(ids(produce(page, deleteFeedBlock('p', OFF)))).not.toContain('p');
    });

    it('adds a feed section at the end, never past the limit', () => {
        expect(ids(produce(layout(faq), appendFeedSection(prompt, OFF))).at(-1)).toBe('p');
        expect(ids(produce(layout(faq), insertFeedSection(prompt, { after: 'feed-feedDescription' }, OFF))).at(-1)).toBe('p');
        const full = produce(layout(), (draft) => {
            while (draft.sections.length < MAX_SECTIONS) draft.sections.push({ ...faq, id: `x${draft.sections.length}` });
        });
        expect(produce(full, appendFeedSection(prompt, OFF))).toBe(full);
        expect(addableFeedModeTypes(full, { hasSchedule: true, hasHeOrShe: true })).toEqual([]);
    });

    it('still adds an invitation section after the last host block, before the feed sections', () => {
        expect(ids(produce(layout(prompt), appendFeedSection(faq, ON))).slice(-3)).toEqual(['feed-feedRsvp', 'faq', 'p']);
    });

    it('lists only the feed sections not on the page, each when the event has what it draws', () => {
        const added = produce(defaultFeedLayout(), appendFeedSection(prompt, OFF));
        expect(addableFeedModeTypes(added, { hasSchedule: true, hasHeOrShe: true })).toEqual(['feedSchedule', 'feedHeOrShe', 'feedPinned']);
        expect(addableFeedModeTypes(page, { hasSchedule: true, hasHeOrShe: false })).toEqual(['feedPinned']);
        expect(addableFeedModeTypes(defaultFeedLayout(), { hasSchedule: false, hasHeOrShe: false })).toEqual(['feedPrompt', 'feedPinned']);
        expect(addableFeedModeTypes(defaultFeedLayout(), { hasSchedule: false, hasHeOrShe: true })).toEqual(['feedPrompt', 'feedHeOrShe', 'feedPinned']);
    });

    it('offers Pinned photos on every plan, once', () => {
        const pinned = createFeedModeSection('feedPinned', () => 'pp');
        expect(addableFeedModeTypes(layout(), { hasSchedule: false, hasHeOrShe: false })).toContain('feedPinned');
        expect(addableFeedModeTypes(layout(pinned), { hasSchedule: false, hasHeOrShe: false })).not.toContain('feedPinned');
    });

    it('lists the feed sections in the edit frame, hidden ones too', () => {
        const frame = feedEditFrame(layout(faq, prompt, { ...schedule, visible: false }), OFF);
        expect(frame.feed.map((section) => section.id)).toEqual(['p', 's']);
        expect(frame.middle.map((section) => section.id)).toEqual(['feed-feedDescription', 'faq']);
    });
});
