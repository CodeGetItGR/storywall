import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedPhotoUploads } from '@/hooks/useFeedPhotoUploads';
import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { defaultFeedLayout } from '@/lib/feedLayout';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import { photoFieldSlot } from '@/lib/invitation/photoSlots';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

// jsdom draws no canvas: the photo goes as picked.
vi.mock('browser-image-compression', () => ({ default: async (file: File) => file }));

type Couple = Extract<InvitationSection, { type: 'coupleProfiles' }>;

const saved = { mediaId: 'img-new', url: 'https://cdn.example/new.jpg', contentType: 'image/jpeg', width: 10, height: 10, byteSize: 1 };
const jpeg = () => new File(['x'], 'a.jpg', { type: 'image/jpeg' });
const couple = { ...(SAMPLE_SECTIONS.coupleProfiles as InvitationSection), id: 'couple' } as Couple;
const slot = photoFieldSlot('couple', 'partnerA.photo');

function setup() {
    const base = defaultFeedLayout();
    const store = createInvitationEditorStore({ ...base, sections: [...base.sections, couple] });
    const remember = vi.fn();
    const hook = renderHook(() => useFeedPhotoUploads({ eventId: 'e1', store, remember }));
    const partnerA = () => (store.getState().document.sections.find((section) => section.id === 'couple') as Couple).data.partnerA;
    return { ...hook, remember, partnerA };
}

describe('useFeedPhotoUploads', () => {
    const post = vi.spyOn(api, 'postForm');
    beforeEach(() => {
        post.mockReset().mockResolvedValue(saved);
    });

    it("sends a person's photo to the feed, puts it in its place and shows it at once", async () => {
        const { result, remember, partnerA } = setup();
        await act(() => result.current.upload(slot, jpeg()));
        expect(post.mock.calls[0][0]).toBe(endpoints.events.feedLayoutImages('e1'));
        expect(remember).toHaveBeenCalledWith({ mediaId: 'img-new', url: saved.url });
        expect(partnerA().photo).toEqual({ source: 'media', mediaId: 'img-new' });
        expect(result.current.issue).toBeNull();
    });

    it('says why a photo did not upload, at its place, and clears it on the next try', async () => {
        const { result, partnerA } = setup();
        const before = partnerA().photo;
        post.mockRejectedValueOnce(new Error('offline'));
        await act(() => result.current.upload(slot, jpeg()));
        expect(result.current.issue).toEqual({ problem: 'failed', sectionId: 'couple', key: 'field:couple:partnerA.photo' });
        expect(partnerA().photo).toEqual(before);

        await act(() => result.current.upload(slot, jpeg()));
        expect(result.current.issue).toBeNull();
    });

    it('refuses a file of another type without sending it', async () => {
        const { result } = setup();
        await act(() => result.current.upload(slot, new File(['x'], 'a.gif', { type: 'image/gif' })));
        expect(result.current.issue?.problem).toBe('type');
        expect(post).not.toHaveBeenCalled();
    });

    it('names the photo limit when the feed holds as many as it can', async () => {
        const { result } = setup();
        const error = Object.assign(Object.create(ApiError.prototype) as ApiError, { problem: { errorCode: 5228 } });
        post.mockRejectedValueOnce(error);
        await act(() => result.current.upload(slot, jpeg()));
        expect(result.current.issue?.problem).toBe('full');
    });

    it('puts a full gallery on its own section', () => {
        const { result } = setup();
        act(() => result.current.report('galleryFull', 'g1'));
        expect(result.current.issue).toEqual({ problem: 'galleryFull', sectionId: 'g1', key: null });
        act(() => result.current.report(null, 'g1'));
        expect(result.current.issue).toBeNull();
    });
});
