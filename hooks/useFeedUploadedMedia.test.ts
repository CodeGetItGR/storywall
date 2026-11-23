import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useFeedUploadedMedia } from '@/hooks/useFeedUploadedMedia';

describe('useFeedUploadedMedia', () => {
    it("knows this session's uploads and falls back to the layout's", () => {
        const layout = (id: string) => (id === 'img-saved' ? 'https://r2/saved' : undefined);
        const { result } = renderHook(() => useFeedUploadedMedia(layout));
        expect(result.current.media('img-saved')).toBe('https://r2/saved');
        expect(result.current.media('img-new')).toBeUndefined();
        act(() => result.current.remember({ mediaId: 'img-new', url: 'https://r2/new' }));
        expect(result.current.media('img-new')).toBe('https://r2/new');
    });
});
