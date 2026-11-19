import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAnnouncementPost } from '@/hooks/useAnnouncementPost';

const create = vi.fn();
vi.mock('@/hooks/usePosts', () => ({ useCreatePost: () => ({ mutateAsync: create, isPending: false }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'failed' }));

beforeEach(() => {
    create.mockReset();
});

describe('useAnnouncementPost', () => {
    it('posts an unpinned, trimmed announcement', async () => {
        create.mockResolvedValue({ id: 'p1', eventId: 'e1' });
        const { result } = renderHook(() => useAnnouncementPost());
        let posted = false;
        await act(async () => {
            posted = await result.current.post('e1', '  Dinner at 9  ');
        });
        expect(posted).toBe(true);
        expect(create).toHaveBeenCalledWith({ eventId: 'e1', type: 'ANNOUNCEMENT', content: 'Dinner at 9', isPinned: false });
    });

    it('sends nothing for a blank message', async () => {
        const { result } = renderHook(() => useAnnouncementPost());
        await act(async () => {
            await result.current.post('e1', '   ');
        });
        expect(create).not.toHaveBeenCalled();
    });

    it('keeps the server error until reset', async () => {
        create.mockRejectedValue(new Error('403'));
        const { result } = renderHook(() => useAnnouncementPost());
        let posted = true;
        await act(async () => {
            posted = await result.current.post('e1', 'Dinner at 9');
        });
        expect(posted).toBe(false);
        expect(result.current.error).toBe('failed');
        act(() => result.current.reset());
        expect(result.current.error).toBeNull();
    });
});
