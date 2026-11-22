import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from 'zustand';

import { useFeedBlockActions } from '@/hooks/useFeedBlockActions';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { defaultFeedLayout } from '@/lib/feedLayout';
import { MAX_SECTIONS } from '@/lib/invitation/document';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

const upgrade = vi.hoisted(() => ({ href: '/events/e-1/manage?tab=billing' as string | null }));
vi.mock('@/hooks/usePlanUpgradeHref', () => ({ usePlanUpgradeHref: () => upgrade.href }));

const dressCode = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };

function eventWith(saveMyDate: boolean) {
    return {
        id: 'e-1',
        eventType: 'WEDDING',
        modules: saveMyDate ? [{ moduleKey: 'save_my_date', isAvailable: true, isEnabled: true }] : [],
    } as unknown as EventDetailResponseDto;
}

function setup(saveMyDate = true, extra: InvitationSection[] = [dressCode]) {
    const base = defaultFeedLayout();
    const store = createInvitationEditorStore({ ...base, sections: [...base.sections, ...extra] });
    const leaveTo = vi.fn();
    const hook = renderHook(() => {
        const document = useStore(store, (state) => state.document);
        return useFeedBlockActions(store, document, eventWith(saveMyDate), leaveTo);
    });
    return { store, leaveTo, ...hook };
}

const middle = (sections: InvitationSection[]) => sections.filter((section) => section.id === 'dress' || section.type === 'feedDescription');

beforeEach(() => {
    upgrade.href = '/events/e-1/manage?tab=billing';
});

describe('useFeedBlockActions', () => {
    it('hides and shows a block', () => {
        const { store, result } = setup();
        act(() => result.current.toggleVisible('feed-feedRsvp'));
        expect(store.getState().document.sections[3].visible).toBe(false);
        act(() => result.current.toggleVisible('feed-feedRsvp'));
        expect(store.getState().document.sections[3].visible).toBe(true);
    });

    it('moves a middle block', () => {
        const { store, result } = setup();
        act(() => result.current.move('dress', -1));
        expect(middle(store.getState().document.sections).map((section) => section.id)).toEqual(['dress', 'feed-feedDescription']);
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

    it('leaves out the Add section row at the section limit', () => {
        expect(setup().result.current.showAdd).toBe(true);
        const full = Array.from({ length: MAX_SECTIONS - defaultFeedLayout().sections.length }, (_, index) => ({ ...dressCode, id: `dress-${index}` }));
        const { result } = setup(true, full);
        expect(result.current.addable).toEqual([]);
        expect(result.current.showAdd).toBe(false);
        act(() => result.current.openAdd());
        expect(result.current.adding).toBe(false);
    });

    it('sends a host without Save my date to Billing', () => {
        const { leaveTo, result } = setup(false);
        expect(result.current.locked).toBe(true);
        expect(result.current.showAdd).toBe(true);
        act(() => result.current.openAdd());
        expect(result.current.adding).toBe(false);
        expect(leaveTo).toHaveBeenCalledWith('/events/e-1/manage?tab=billing');
    });

    it('does nothing for a co-host who cannot buy', () => {
        upgrade.href = null;
        const { leaveTo, result } = setup(false);
        expect(result.current.canBuy).toBe(false);
        act(() => result.current.openAdd());
        expect(leaveTo).not.toHaveBeenCalled();
    });
});
