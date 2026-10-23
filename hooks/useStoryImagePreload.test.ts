import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useStoryImagePreload } from '@/hooks/useStoryImagePreload';
import type { StoryResponseDto } from '@/lib/api/types';

const preload = vi.hoisted(() => vi.fn());
vi.mock('react-dom', async (importOriginal) => ({ ...(await importOriginal<typeof import('react-dom')>()), preload }));

function story(mediaType: 'IMAGE' | 'VIDEO', mediaUrl = 'https://media.example.com/s1.jpg'): StoryResponseDto {
    return { id: 's1', media: { id: 'm1', mediaType, mediaUrl } } as unknown as StoryResponseDto;
}

beforeEach(() => {
    preload.mockReset();
});

describe('useStoryImagePreload', () => {
    // The same srcset and sizes the viewer's next/image renders, so the preloaded file is the one it shows.
    it("preloads a photo story's image as the viewer will request it", () => {
        renderHook(() => useStoryImagePreload(story('IMAGE')));

        expect(preload).toHaveBeenCalledOnce();
        const [href, options] = preload.mock.calls[0];
        expect(href).toContain(encodeURIComponent('https://media.example.com/s1.jpg'));
        expect(options).toMatchObject({ as: 'image', imageSizes: '100vw', fetchPriority: 'low' });
        expect(options.imageSrcSet).toContain('w=');
    });

    it("doesn't preload a video story", () => {
        renderHook(() => useStoryImagePreload(story('VIDEO')));

        expect(preload).not.toHaveBeenCalled();
    });

    it('does nothing without a story', () => {
        renderHook(() => useStoryImagePreload(null));

        expect(preload).not.toHaveBeenCalled();
    });
});
