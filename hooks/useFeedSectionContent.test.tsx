import { act, renderHook } from '@testing-library/react';
import { produce } from 'immer';
import { describe, expect, it, vi } from 'vitest';

import { useFeedSectionContent } from '@/hooks/useFeedSectionContent';
import type { FeedFailedPhoto } from '@/hooks/useFeedSectionEdits';
import { defaultFeedLayout, newFeedBlock } from '@/lib/feedLayout';
import { setSectionColor, setSectionPhoto } from '@/lib/feedSectionBackground';
import type { RenderContext } from '@/lib/invitation/render';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

// The text colour is blockTextColor's own test.
vi.mock('@/lib/feedBlockEdits', () => ({ blockTextColor: () => '#4A3B32' }));

const dress: InvitationSection = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };
const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
const edited = (recipe: ReturnType<typeof setSectionColor>) =>
    produce({ ...defaultFeedLayout(), sections: [dress] }, recipe).sections[0];

function setup(section: InvitationSection | null = dress, { failed = null as FeedFailedPhoto | null, uploadingId = null as string | null } = {}) {
    const calls = {
        addPhoto: vi.fn(async () => true),
        setTextColor: vi.fn(),
        setBackgroundPhoto: vi.fn(async () => true),
        removeBackgroundPhoto: vi.fn(),
        setBackgroundColor: vi.fn(),
    };
    const { result } = renderHook(() => useFeedSectionContent(section, {} as RenderContext, [], { uploadingId, failed, ...calls }));
    return { content: result.current, ...calls };
}

describe('useFeedSectionContent', () => {
    it('is only for a Save my date section the host may change', () => {
        expect(setup(null).content).toBeNull();
        expect(setup(newFeedBlock('feedDescription')).content).toBeNull();
        expect(setup({ ...dress, locked: true }).content).toBeNull();
        expect(setup().content).not.toBeNull();
    });

    it("reads the section's own background", () => {
        expect(setup().content?.background).toMatchObject({ color: undefined, hasPhoto: false });
        expect(setup(edited(setSectionColor('dress', '#B5BFA6'))).content?.background).toMatchObject({ color: '#B5BFA6', hasPhoto: false });
        expect(setup(edited(setSectionPhoto('dress', 'm-1'))).content?.background).toMatchObject({ color: undefined, hasPhoto: true });
    });

    it('changes the background of the open section', () => {
        const { content, setBackgroundPhoto, removeBackgroundPhoto, setBackgroundColor } = setup();
        act(() => {
            content?.background.onPickPhoto(file);
            content?.background.onRemovePhoto();
            content?.background.onColor('#B5BFA6');
            content?.background.onColor(undefined);
        });
        expect(setBackgroundPhoto).toHaveBeenCalledExactlyOnceWith('dress', file);
        expect(removeBackgroundPhoto).toHaveBeenCalledExactlyOnceWith('dress');
        expect(setBackgroundColor.mock.calls).toEqual([
            ['dress', '#B5BFA6'],
            ['dress', undefined],
        ]);
    });

    it('shows an error by the photo that failed, in its own section only', () => {
        const at = (failed: FeedFailedPhoto) => {
            const { content } = setup(dress, { failed });
            return [content?.failed, content?.background.failed];
        };
        expect(at({ id: 'dress', place: 'content' })).toEqual([true, false]);
        expect(at({ id: 'dress', place: 'background' })).toEqual([false, true]);
        expect(at({ id: 'other', place: 'background' })).toEqual([false, false]);
    });

    it("is busy while one of the section's photos uploads", () => {
        expect(setup(dress, { uploadingId: 'dress' }).content?.uploading).toBe(true);
        expect(setup(dress, { uploadingId: 'other' }).content?.uploading).toBe(false);
    });
});
