import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useFeedBlockSheet } from '@/hooks/useFeedBlockSheet';
import { defaultFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { SettingsPart } from '@/lib/settingsPreview';

const dressCode = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };
const theme = wallThemeDesign(null);
const media = () => undefined;
const allParts: SettingsPart[] = ['cover', 'title', 'date', 'location', 'description'];

function setup() {
    const base = defaultFeedLayout();
    const store = createInvitationEditorStore({ ...base, sections: [...base.sections, dressCode] });
    return renderHook(() => useFeedBlockSheet(store, store.getState().document, theme, media, [], allParts));
}

describe('useFeedBlockSheet', () => {
    it("opens a feed block's event parts", () => {
        const { result } = setup();
        act(() => result.current.openFor('feed-feedCover'));
        expect(result.current.section?.id).toBe('feed-feedCover');
        expect(result.current.parts).toEqual(['cover', 'title']);
    });

    it("opens a Save my date block's own groups, with no photo uploads", () => {
        const { result } = setup();
        act(() => result.current.openFor('dress'));
        expect(result.current.groups).toContain('dressCode');
        expect(result.current.groups).not.toContain('gallery');
        expect(result.current.scope?.mode).toBe('host');
        expect(result.current.parts).toEqual([]);
    });

    it('gives a block a pencil only when it has something to set', () => {
        const { result } = setup();
        const rsvp = defaultFeedLayout().sections[3];
        expect(result.current.hasSettings(rsvp)).toBe(result.current.groupsOf(rsvp).length > 0);
    });

    it('closes', () => {
        const { result } = setup();
        act(() => result.current.openFor('dress'));
        act(() => result.current.close());
        expect(result.current.section).toBeNull();
    });
});
