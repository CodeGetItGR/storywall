import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useComposerController } from '@/hooks/useComposerController';

const state = vi.hoisted(() => ({ status: 'ACTIVE' }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useAnnouncementPost', () => ({ useAnnouncementPost: () => ({ reset: vi.fn(), post: vi.fn(), isPosting: false, error: null }) }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));
vi.mock('@/hooks/useCanAnnounce', () => ({ useCanAnnounce: () => false }));
vi.mock('@/hooks/useStoryComposerController', () => ({ useStoryComposerController: () => ({ open: vi.fn(), isOpen: false }) }));
vi.mock('@/providers/publishQueue/PublishQueueContext', () => ({ usePublishQueue: () => ({}) }));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => ({
        id: 'e-1',
        status: state.status,
        modules: ['posts', 'playlist'].map((moduleKey) => ({ moduleKey, isAvailable: true })),
    }),
    useActiveMember: () => ({ id: 'm-1', displayName: 'Maria' }),
}));

const photo = new File(['x'], 'dance.jpg', { type: 'image/jpeg' });
const files = (...list: File[]) => list as unknown as FileList;

beforeEach(() => {
    state.status = 'ACTIVE';
    URL.createObjectURL = vi.fn(() => 'blob:photo');
    URL.revokeObjectURL = vi.fn();
});

describe('useComposerController openPostWithFiles', () => {
    it('opens the post composer with the photos in it', () => {
        const { result } = renderHook(() => useComposerController());
        act(() => result.current.contextValue.openSongComposer());
        expect(result.current.composerMode).toBe('song');
        act(() => result.current.contextValue.openPostWithFiles(files(photo)));
        expect(result.current.isOpen).toBe(true);
        expect(result.current.composerMode).toBe('post');
        expect(result.current.images.map((image) => image.file)).toEqual([photo]);
        expect(result.current.activeMediaPreview).toBeNull();
    });

    it('opens nothing when nothing was picked', () => {
        const { result } = renderHook(() => useComposerController());
        act(() => result.current.contextValue.openPostWithFiles(files()));
        act(() => result.current.contextValue.openPostWithFiles(null));
        expect(result.current.isOpen).toBe(false);
    });

    it("opens nothing for a member who can't post", () => {
        state.status = 'ENDED';
        const { result } = renderHook(() => useComposerController());
        act(() => result.current.contextValue.openPostWithFiles(files(photo)));
        expect(result.current.isOpen).toBe(false);
        expect(result.current.images).toEqual([]);
    });
});
