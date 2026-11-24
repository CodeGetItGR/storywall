import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFeedSectionEdits } from '@/hooks/useFeedSectionEdits';
import { defaultFeedLayout } from '@/lib/feedLayout';
import { sectionColor, sectionPhoto } from '@/lib/feedSectionBackground';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import type { ImageUploader } from '@/lib/invitation/editorUploads';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

const dress: InvitationSection = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };
const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });

function setup(upload: ImageUploader = vi.fn(async () => ({ mediaId: 'm-1', url: 'https://media/m-1' }) as never)) {
    const base = defaultFeedLayout();
    const store = createInvitationEditorStore({ ...base, sections: [...base.sections, dress] });
    const remember = vi.fn();
    const fieldPaths = () => [];
    const view = renderHook(() => useFeedSectionEdits({ store, upload, remember, fieldPaths }));
    const section = () => store.getState().document.sections.find((item) => item.id === 'dress') as InvitationSection;
    return { ...view, store, remember, section };
}

describe('useFeedSectionEdits', () => {
    it('puts an uploaded photo behind the section, and takes it away', async () => {
        const { result, remember, section } = setup();
        await act(async () => {
            expect(await result.current.setBackgroundPhoto('dress', file)).toBe(true);
        });
        expect(remember).toHaveBeenCalledWith({ mediaId: 'm-1', url: 'https://media/m-1' });
        expect(sectionPhoto(section())).toBe('m-1');
        expect(result.current.uploadingId).toBeNull();
        act(() => result.current.removeBackgroundPhoto('dress'));
        expect(sectionPhoto(section())).toBeUndefined();
    });

    it('leaves the section as it was when the upload fails, and says which photo failed', async () => {
        const { result, section } = setup(vi.fn(async () => Promise.reject(new Error('offline'))));
        const before = section();
        await act(async () => {
            expect(await result.current.setBackgroundPhoto('dress', file)).toBe(false);
        });
        expect(section()).toEqual(before);
        expect(result.current.failed).toEqual({ id: 'dress', place: 'background' });
        await act(async () => {
            await result.current.addPhoto('dress', file);
        });
        expect(result.current.failed).toEqual({ id: 'dress', place: 'content' });
    });

    it('makes one undo step of a colour being mixed, and one of going back to the default', () => {
        const { result, store, section } = setup();
        act(() => result.current.setBackgroundColor('dress', '#B5BFA6'));
        act(() => result.current.setBackgroundColor('dress', '#AC9FC7'));
        expect(sectionColor(section())).toBe('#AC9FC7');
        act(() => result.current.setBackgroundColor('dress', undefined));
        expect(sectionColor(section())).toBeUndefined();
        act(() => store.getState().undo());
        expect(sectionColor(section())).toBe('#AC9FC7');
        act(() => store.getState().undo());
        expect(sectionColor(section())).toBeUndefined();
    });
});
