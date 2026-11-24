import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
const gallery = { ...(SAMPLE_SECTIONS.gallery as InvitationSection), id: 'gallery' };
const image = { mediaId: 'm1', url: 'https://cdn.example/m1.jpg', width: 10, height: 10 };

function setup() {
    const base = defaultFeedLayout();
    const store = createInvitationEditorStore({ ...base, sections: [...base.sections, dressCode, gallery] });
    const uploads = { uploadImage: vi.fn().mockResolvedValue(image), remember: vi.fn() };
    const hook = renderHook(() => useFeedBlockSheet(store, store.getState().document, theme, media, [], allParts, uploads));
    return { ...hook, uploads };
}

describe('useFeedBlockSheet', () => {
    it("opens a feed block's event parts", () => {
        const { result } = setup();
        act(() => result.current.openFor('feed-feedCover'));
        expect(result.current.section?.id).toBe('feed-feedCover');
        expect(result.current.parts).toEqual(['cover', 'title']);
    });

    it("opens a Save my date block's own groups", () => {
        const { result } = setup();
        act(() => result.current.openFor('dress'));
        expect(result.current.groups).toContain('dressCode');
        expect(result.current.scope?.mode).toBe('host');
        expect(result.current.parts).toEqual([]);
    });

    it('uploads photos to the feed and remembers each one', async () => {
        const { result, uploads } = setup();
        act(() => result.current.openFor('gallery'));
        expect(result.current.groups).toContain('gallery');
        await expect(result.current.scope!.uploadImage(new Blob())).resolves.toEqual(image);
        expect(uploads.remember).toHaveBeenCalledWith(image);
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
