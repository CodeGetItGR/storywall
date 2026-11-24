import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useStore } from 'zustand';

import { useFeedBlockActions } from '@/hooks/useFeedBlockActions';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { defaultFeedLayout } from '@/lib/feedLayout';
import { MAX_SECTIONS } from '@/lib/invitation/document';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

const dressCode = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };

const event = { id: 'e-1', eventType: 'WEDDING' } as unknown as EventDetailResponseDto;
// Without Save my date: RSVP keeps its fixed place.
const OFF = { rsvpMoves: false };

function setup(extra: InvitationSection[] = [dressCode]) {
    const base = defaultFeedLayout();
    const store = createInvitationEditorStore({ ...base, sections: [...base.sections, ...extra] });
    const hook = renderHook(() => {
        const document = useStore(store, (state) => state.document);
        return useFeedBlockActions(store, document, event, OFF);
    });
    return { store, ...hook };
}

describe('useFeedBlockActions', () => {
    it('hides and shows a block', () => {
        const { store, result } = setup();
        act(() => result.current.toggleVisible('feed-feedRsvp'));
        expect(store.getState().document.sections[3].visible).toBe(false);
        act(() => result.current.toggleVisible('feed-feedRsvp'));
        expect(store.getState().document.sections[3].visible).toBe(true);
    });

    it('asks before deleting, and never for a feed block', () => {
        const { result } = setup();
        act(() => result.current.askDelete('feed-feedDescription'));
        expect(result.current.remove.isOpen).toBe(false);
        act(() => result.current.askDelete('dress'));
        expect(result.current.remove.isOpen).toBe(true);
    });

    it('opens the add list and appends what was picked', () => {
        const { store, result } = setup();
        act(() => result.current.openAdd());
        expect(result.current.adding).toBe(true);
        const type = result.current.addable[0];
        const before = store.getState().document.sections.length;
        act(() => result.current.add(type));
        expect(result.current.adding).toBe(false);
        expect(store.getState().document.sections).toHaveLength(before + 1);
        expect(store.getState().document.sections.some((section) => section.type === type)).toBe(true);
    });

    it('puts what was picked at the row the list was opened from', () => {
        const { store, result } = setup();
        act(() => result.current.openAdd({ before: 'feed-feedDescription' }));
        act(() => result.current.add('faq'));
        const types = store.getState().document.sections.map((section) => section.type);
        expect(types.indexOf('faq')).toBe(types.indexOf('feedDescription') - 1);
    });

    it("adds a module's block from its tile, and RSVP's own block", () => {
        const { store, result } = setup();
        act(() => result.current.openAdd({ after: 'dress' }));
        act(() => result.current.addModule('playlist'));
        const sections = store.getState().document.sections;
        const at = sections.findIndex((section) => section.id === 'dress');
        expect(sections[at + 1]).toMatchObject({ type: 'feedModule', data: { module: 'playlist' } });
        expect(result.current.adding).toBe(false);
    });

    it('leaves out the Add section row at the section limit', () => {
        expect(setup().result.current.showAdd).toBe(true);
        const full = Array.from({ length: MAX_SECTIONS - defaultFeedLayout().sections.length }, (_, index) => ({
            ...dressCode,
            id: `dress-${index}`,
        }));
        const { result } = setup(full);
        expect(result.current.addable).toEqual([]);
        expect(result.current.showAdd).toBe(false);
        act(() => result.current.openAdd());
        expect(result.current.adding).toBe(false);
    });
});
