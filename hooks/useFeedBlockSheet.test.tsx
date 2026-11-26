import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useStore } from 'zustand';

import { useFeedBlockSheet } from '@/hooks/useFeedBlockSheet';
import { defaultFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import { createFeedModeSection } from '@/lib/feedSections';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { SettingsPart } from '@/lib/settingsPreview';

const dressCode = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };
const theme = wallThemeDesign(null);
const media = () => undefined;
const allParts: SettingsPart[] = ['cover', 'title', 'date', 'location', 'description'];
const gallery = { ...(SAMPLE_SECTIONS.gallery as InvitationSection), id: 'gallery' };
const prompt = createFeedModeSection('feedPrompt', () => 'prompt');
const pinned = createFeedModeSection('feedPinned', () => 'pinned');
const image = { mediaId: 'm1', url: 'https://cdn.example/m1.jpg', width: 10, height: 10 };

function setup() {
    const base = defaultFeedLayout();
    const store = createInvitationEditorStore({ ...base, sections: [...base.sections, dressCode, gallery, prompt, pinned] });
    const uploads = { uploadImage: vi.fn().mockResolvedValue(image), remember: vi.fn() };
    const hook = renderHook(() => {
        const document = useStore(store, (state) => state.document);
        return useFeedBlockSheet(store, document, theme, media, [], allParts, uploads);
    });
    return { ...hook, store, uploads };
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
        expect(result.current.groups).toEqual(['galleryPhotos', 'galleryLayout']);
        await expect(result.current.scope!.uploadImage(new Blob())).resolves.toEqual(image);
        expect(uploads.remember).toHaveBeenCalledWith(image);
    });

    it('gives a block a pencil only when it has something to set', () => {
        const { result } = setup();
        const rsvp = defaultFeedLayout().sections[3];
        expect(result.current.hasSettings(rsvp)).toBe(result.current.groupsOf(rsvp).length > 0);
    });

    it("opens the photo prompt for its line, and keeps what's typed", () => {
        const { result } = setup();
        expect(result.current.promptText).toBeNull();
        act(() => result.current.openFor('prompt'));
        expect(result.current.promptText).toBe('');
        expect(result.current.membersOnly).toBeNull();
        act(() => result.current.setPromptText('Show us'));
        expect(result.current.promptText).toBe('Show us');
    });

    it('opens Pinned photos to add, order and remove its photos', async () => {
        const { result, uploads } = setup();
        expect(result.current.hasSettings(pinned)).toBe(true);
        expect(result.current.pinned).toBeNull();
        act(() => result.current.openFor('pinned'));
        expect(result.current.pinned).toEqual([]);
        await act(() => result.current.addPinned(new File(['x'], 'a.jpg')));
        await act(() => result.current.addPinned(new File(['x'], 'b.jpg')));
        const [first, second] = result.current.pinned!;
        expect(first.image).toEqual({ source: 'media', mediaId: 'm1' });
        expect(first.id).not.toBe(second.id);
        expect(uploads.remember).toHaveBeenCalledWith(image);
        act(() => result.current.movePinned(second.id, first.id));
        expect(result.current.pinned!.map((photo) => photo.id)).toEqual([second.id, first.id]);
        act(() => result.current.removePinned(second.id));
        expect(result.current.pinned!.map((photo) => photo.id)).toEqual([first.id]);
    });

    it('says when a pinned photo is uploading', async () => {
        const { result, uploads } = setup();
        let finish: (value: typeof image) => void = () => undefined;
        uploads.uploadImage.mockReturnValue(new Promise<typeof image>((resolve) => (finish = resolve)));
        act(() => result.current.openFor('pinned'));
        let adding: Promise<void> | undefined;
        act(() => void (adding = result.current.addPinned(new File(['x'], 'a.jpg'))));
        expect(result.current.pinnedUploading).toBe(true);
        await act(async () => {
            finish(image);
            await adding;
        });
        expect(result.current.pinnedUploading).toBe(false);
    });

    it('keeps the photos when an upload fails', async () => {
        const { result, uploads } = setup();
        uploads.uploadImage.mockRejectedValue(new Error('offline'));
        act(() => result.current.openFor('pinned'));
        await act(() => result.current.addPinned(new File(['x'], 'a.jpg')));
        expect(result.current.pinned).toEqual([]);
        expect(result.current.pinnedUploading).toBe(false);
    });

    it("gives today's schedule and Boy or Girl no pencil: they draw the event's own content", () => {
        const { result } = setup();
        expect(result.current.hasSettings(createFeedModeSection('feedSchedule'))).toBe(false);
        expect(result.current.hasSettings(createFeedModeSection('feedHeOrShe'))).toBe(false);
        expect(result.current.hasSettings(prompt)).toBe(true);
    });

    it('closes', () => {
        const { result } = setup();
        act(() => result.current.openFor('dress'));
        act(() => result.current.close());
        expect(result.current.section).toBeNull();
    });
});
