import { describe, expect, it, vi } from 'vitest';

import type { MediaResponseDto, PostResponseDto } from '@/lib/api/types';
import { CONTENT_VIEWS_BATCH_MAX, createContentViewQueue, isCountableProMedia, isVendorPost } from '@/lib/contentViews';

describe('createContentViewQueue', () => {
    it('sends each id once per tab, grouped by event', () => {
        const send = vi.fn().mockResolvedValue(undefined);
        const queue = createContentViewQueue(send);
        expect(queue.add('e1', 'media', 'm1')).toBe(true);
        expect(queue.add('e1', 'media', 'm1')).toBe(false);
        queue.add('e1', 'post', 'p1');
        queue.add('e2', 'media', 'm9');

        queue.flush();
        expect(send).toHaveBeenCalledWith('e1', { mediaIds: ['m1'], postIds: ['p1'] }, false);
        expect(send).toHaveBeenCalledWith('e2', { mediaIds: ['m9'], postIds: [] }, false);

        send.mockClear();
        queue.add('e1', 'media', 'm1');
        queue.flush();
        expect(send).not.toHaveBeenCalled();
    });

    it('splits into batches of 50 and passes keepalive', () => {
        const send = vi.fn().mockResolvedValue(undefined);
        const queue = createContentViewQueue(send);
        for (let i = 0; i < CONTENT_VIEWS_BATCH_MAX + 1; i++) queue.add('e1', 'media', `m${i}`);
        queue.flush(true);
        expect(send).toHaveBeenCalledTimes(2);
        expect(send.mock.calls[0][1].mediaIds).toHaveLength(50);
        expect(send.mock.calls[1][1].mediaIds).toEqual(['m50']);
        expect(send.mock.calls[0][2]).toBe(true);
    });

    it('drops a failed batch silently', async () => {
        const send = vi.fn().mockRejectedValue(new Error('429'));
        const queue = createContentViewQueue(send);
        queue.add('e1', 'post', 'p1');
        expect(() => queue.flush()).not.toThrow();
        await Promise.resolve();
        send.mockClear();
        queue.flush();
        expect(send).not.toHaveBeenCalled();
    });
});

describe('countable', () => {
    it('counts Pro items of others and vendor posts', () => {
        expect(isCountableProMedia({ collection: 'PRO', uploaderMemberId: 'v' } as MediaResponseDto, 'g')).toBe(true);
        expect(isCountableProMedia({ collection: 'PRO', uploaderMemberId: 'g' } as MediaResponseDto, 'g')).toBe(false);
        expect(isCountableProMedia({ collection: 'GUEST', uploaderMemberId: 'v' } as MediaResponseDto, 'g')).toBe(false);
        expect(isVendorPost({ author: { vendorType: 'PHOTOGRAPHER' } } as PostResponseDto)).toBe(true);
        expect(isVendorPost({ author: { vendorType: null } } as PostResponseDto)).toBe(false);
        expect(isVendorPost({ author: null } as PostResponseDto)).toBe(false);
    });
});
