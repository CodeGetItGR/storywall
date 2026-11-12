import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useStore } from 'zustand';

import { useThemeAssets } from '@/hooks/useThemeAssets';
import { BLANK_THEME_DESIGN, blankThemeDocument } from '@/lib/adminInvitationThemes';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import type { ImageUploader } from '@/lib/invitation/editorUploads';

const file = (name: string) => new File(['x'], name, { type: 'image/png' });

function renderAssets(uploadImage: ImageUploader) {
    const store = createInvitationEditorStore(blankThemeDocument('WEDDING', 'garden'), structuredClone(BLANK_THEME_DESIGN), { imageId: 'og-old' });
    const addUploaded = vi.fn();
    const markRemoved = vi.fn();
    const hook = renderHook(() => {
        const design = useStore(store, (state) => state.theme!);
        const share = useStore(store, (state) => state.share!);
        return useThemeAssets({ store, design, share, uploadImage, addUploaded, markRemoved });
    });
    return { store, addUploaded, markRemoved, ...hook };
}

let next = 0;
const uploader: ImageUploader = async (picked) => ({ mediaId: `asset-${++next}`, url: `https://cdn.test/${(picked as File).name}`, width: 640, height: 480 });

describe('useThemeAssets', () => {
    it('uploads art, shows it at once and marks the old image for deletion on a replace', async () => {
        const { result, store, addUploaded, markRemoved } = renderAssets(uploader);
        await act(() => result.current.setArt('main', file('a.png')));
        const first = store.getState().theme!.art.main!.image.mediaId;
        expect(addUploaded).toHaveBeenCalledWith(first, 'https://cdn.test/a.png');
        expect(markRemoved).not.toHaveBeenCalled();

        await act(() => result.current.setArt('main', file('b.png')));
        expect(store.getState().theme!.art.main!.image.mediaId).not.toBe(first);
        expect(markRemoved).toHaveBeenCalledWith(first);

        await act(() => result.current.setArt('main', null));
        expect(store.getState().theme!.art.main).toBeUndefined();
    });

    it('keeps the theme as it was when an upload fails, and says which slot failed', async () => {
        const { result, store } = renderAssets(() => Promise.reject(new Error('too big')));
        await act(() => result.current.setBackground('top', 'desktop', file('bg.png')));
        expect(store.getState().theme!.backgrounds.top.desktop).toBeUndefined();
        expect(store.getState().past).toHaveLength(0);
        expect(result.current.failed).toBe('background.top.desktop');
        expect(result.current.busy).toBeNull();
    });

    it('replaces the share image', async () => {
        const { result, store, markRemoved } = renderAssets(uploader);
        await act(() => result.current.setShare(file('og.png')));
        expect(store.getState().share!.imageId).toMatch(/^asset-/);
        expect(markRemoved).toHaveBeenCalledWith('og-old');
    });

    it('adds an element per file, named after it', async () => {
        const { result, store } = renderAssets(uploader);
        await act(() => result.current.addElements([file('leaf.png'), file('rose.webp')]));
        expect(store.getState().theme!.elements.map((element) => element.name)).toEqual(['leaf', 'rose']);
        // One undo step for the whole batch.
        expect(store.getState().past).toHaveLength(1);
    });

    it('adds a frame at the size of its art, and a transition with an optional mobile image', async () => {
        const { result, store } = renderAssets(uploader);
        await act(async () => {
            expect(await result.current.addFrame('', file('gold.png'), file('gold-mask.png'))).toBe(true);
        });
        expect(store.getState().theme!.frames[0]).toMatchObject({ name: 'gold', width: 640, height: 480 });

        await act(async () => {
            await result.current.addTransition('Wave', file('wave.png'), null);
        });
        expect(store.getState().theme!.transitions[0]).toMatchObject({ name: 'Wave' });
        expect(store.getState().theme!.transitions[0].mobile).toBeUndefined();
    });

    it('renames in one undo step while typing, and removes an item with its images', async () => {
        const { result, store, markRemoved } = renderAssets(uploader);
        await act(async () => {
            await result.current.addFrame('Gold', file('gold.png'), file('mask.png'));
        });
        const frame = store.getState().theme!.frames[0];
        act(() => {
            result.current.rename('frames', frame.id, 'Go');
            result.current.rename('frames', frame.id, 'Golden');
        });
        expect(store.getState().theme!.frames[0].name).toBe('Golden');
        expect(store.getState().past).toHaveLength(2);

        act(() => result.current.remove('frames', frame.id));
        expect(store.getState().theme!.frames).toEqual([]);
        expect(markRemoved).toHaveBeenCalledWith(frame.art.mediaId);
        expect(markRemoved).toHaveBeenCalledWith(frame.mask.mediaId);
    });
});
