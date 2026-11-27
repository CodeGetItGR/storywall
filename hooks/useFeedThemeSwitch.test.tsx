import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedThemeSwitch } from '@/hooks/useFeedThemeSwitch';
import { ApiError } from '@/lib/api/client';
import type { EventDetailResponseDto, FeedLayoutDto } from '@/lib/api/types';
import { defaultFeedLayout, readFeedLayout, WALL_THEME_ID } from '@/lib/feedLayout';
import { createSection } from '@/lib/invitation/newSection';
import { SAMPLE_THEME } from '@/lib/invitation/samples';

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('@/lib/api/client', async (original) => ({ ...(await original<typeof import('@/lib/api/client')>()), api }));

const EVENT = { id: 'e1', eventType: 'WEDDING', theme: null } as unknown as EventDetailResponseDto;
const ROSE_DOCUMENT = { ...defaultFeedLayout(), themeId: 'rose-garden', sections: [createSection('top', 'WEDDING')] };
const ROSE = { slug: 'rose', name: 'Rose', eventType: 'WEDDING', design: SAMPLE_THEME, document: ROSE_DOCUMENT, assetUrls: {} };

function savedOnRose(revision: number): FeedLayoutDto {
    return {
        themeSlug: 'rose',
        revision,
        document: { ...ROSE_DOCUMENT, sections: defaultFeedLayout().sections },
        design: SAMPLE_THEME,
        imageUrls: {},
        updatedAt: '2026-11-21T10:00:00Z',
    };
}

function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    api.get.mockReset();
    api.put.mockReset();
    api.get.mockImplementation(async (path: string) => {
        if (path === '/api/invitation-themes/rose') return ROSE;
        if (path === '/api/events/e1/feed-layout') return savedOnRose(4);
        throw new Error(`unexpected ${path}`);
    });
    api.put.mockResolvedValue({ revision: 1, updatedAt: '2026-11-21T10:00:00Z' });
});

// The starter prompt reads next-intl, which these tests do not provide.
vi.mock('@/hooks/useFeedStarterPrompt', () => ({ useFeedStarterPrompt: () => undefined }));

describe('useFeedThemeSwitch', () => {
    it("saves the layout on the theme, under the theme's own id", async () => {
        const { result } = renderHook(() => useFeedThemeSwitch(EVENT, readFeedLayout(null, null)), { wrapper });
        await act(() => result.current.switchTo('rose'));
        const [path, body] = api.put.mock.calls[0];
        expect(path).toBe('/api/events/e1/feed-layout');
        expect(body).toMatchObject({ revision: 0, themeSlug: 'rose', document: { themeId: 'rose-garden' } });
        expect(result.current.isSaved).toBe(true);
    });

    it('tries once more on the newer layout when another save got there first', async () => {
        api.put.mockRejectedValueOnce(new ApiError(409, { errorCode: 5208 }));
        const { result } = renderHook(() => useFeedThemeSwitch(EVENT, readFeedLayout(null, null)), { wrapper });
        await act(() => result.current.switchTo('rose'));
        expect(api.put).toHaveBeenCalledTimes(2);
        expect(api.put.mock.calls[1][1]).toMatchObject({ revision: 4, themeSlug: 'rose' });
        expect(result.current.error).toBeNull();
    });

    it('moves the layout back to the wall theme', async () => {
        const { result } = renderHook(() => useFeedThemeSwitch(EVENT, readFeedLayout(savedOnRose(4), null)), { wrapper });
        await act(() => result.current.switchTo(null));
        expect(api.put.mock.calls[0][1]).toMatchObject({ revision: 4, themeSlug: null, document: { themeId: WALL_THEME_ID } });
    });

    it('shows a refusal and reads the layout again', async () => {
        const refusal = new ApiError(400, { errorCode: 5143 });
        api.put.mockRejectedValue(refusal);
        const { result } = renderHook(() => useFeedThemeSwitch(EVENT, readFeedLayout(null, null)), { wrapper });
        let saved = true;
        await act(async () => {
            saved = await result.current.switchTo('rose');
        });
        expect(saved).toBe(false);
        expect(result.current.error).toBe(refusal);
    });
});
