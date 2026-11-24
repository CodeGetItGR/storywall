import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FeedBackgroundPanel } from '@/hooks/useFeedEditPanels';
import { useFeedSectionBackground } from '@/hooks/useFeedSectionBackground';
import type { FeedFailedPhoto } from '@/hooks/useFeedSectionEdits';
import { defaultFeedLayout } from '@/lib/feedLayout';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

const dress: InvitationSection = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };
const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });

function setup({
    panel = { id: 'dress', kind: 'photo' } as FeedBackgroundPanel | null,
    sections = [dress],
    failed = null as FeedFailedPhoto | null,
    saved = true,
} = {}) {
    const calls = { open: vi.fn(), close: vi.fn(), setPhoto: vi.fn(async () => saved), removePhoto: vi.fn(), setColor: vi.fn() };
    const document = { ...defaultFeedLayout(), sections };
    const { result } = renderHook(() => useFeedSectionBackground({ document, panel, uploadingId: null, failed, ...calls }));
    return { result, ...calls };
}

describe('useFeedSectionBackground', () => {
    it('is closed with no panel, a section that went, and a section with no background of its own', () => {
        expect(setup({ panel: null }).result.current.kind).toBeNull();
        expect(setup({ sections: [] }).result.current.kind).toBeNull();
        expect(setup({ sections: [{ ...dress, locked: true }] }).result.current.kind).toBeNull();
        expect(setup().result.current.kind).toBe('photo');
    });

    it('opens the photo sheet when a photo picked from the dropdown fails', async () => {
        const kept = setup();
        await act(() => kept.result.current.pickFor('dress', file));
        expect(kept.open).not.toHaveBeenCalled();
        const lost = setup({ saved: false });
        await act(() => lost.result.current.pickFor('dress', file));
        expect(lost.open).toHaveBeenCalledExactlyOnceWith('dress', 'photo');
    });

    it("shows the error of its own photo only, not a photo added to the section's content", () => {
        expect(setup({ failed: { id: 'dress', place: 'background' } }).result.current.failed).toBe(true);
        expect(setup({ failed: { id: 'dress', place: 'content' } }).result.current.failed).toBe(false);
        expect(setup({ failed: { id: 'other', place: 'background' } }).result.current.failed).toBe(false);
    });

    it('closes after the photo is removed', () => {
        const { result, removePhoto, close } = setup();
        act(() => result.current.remove());
        expect(removePhoto).toHaveBeenCalledWith('dress');
        expect(close).toHaveBeenCalled();
    });
});
