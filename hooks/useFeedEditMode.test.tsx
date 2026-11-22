import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useFeedEditMode } from '@/hooks/useFeedEditMode';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { feedLayoutKeys } from '@/lib/feedLayout';
import { FeedEditorFlagProvider } from '@/providers/FeedEditorFlagProvider';

// A layout that never arrives, for "until the layout is in".
vi.mock('@/lib/api/client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/api/client')>();
    return { ...actual, api: { ...actual.api, get: () => new Promise(() => undefined) } };
});

const active = { id: 'e-1', theme: null, status: 'ACTIVE' } as unknown as EventDetailResponseDto;

function wrap({ flag = true, loaded = true }: { flag?: boolean; loaded?: boolean } = {}) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    if (loaded) client.setQueryData(feedLayoutKeys.detail('e-1'), null);
    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={client}>
                <FeedEditorFlagProvider enabled={flag}>{children}</FeedEditorFlagProvider>
            </QueryClientProvider>
        );
    };
}

describe('useFeedEditMode', () => {
    it('lets a host start and finish editing', () => {
        const { result } = renderHook(() => useFeedEditMode(active, true), { wrapper: wrap() });
        expect(result.current.canEdit).toBe(true);
        act(() => result.current.start());
        expect(result.current.editing).toBe(true);
        act(() => result.current.finish());
        expect(result.current.editing).toBe(false);
    });

    it('is off for a guest, with the flag off, on a read-only event and until the layout is in', () => {
        expect(renderHook(() => useFeedEditMode(active, false), { wrapper: wrap() }).result.current.canEdit).toBe(false);
        expect(renderHook(() => useFeedEditMode(active, true), { wrapper: wrap({ flag: false }) }).result.current.canEdit).toBe(false);
        const readOnly = { ...active, status: 'ENDED' } as unknown as EventDetailResponseDto;
        expect(renderHook(() => useFeedEditMode(readOnly, true), { wrapper: wrap() }).result.current.canEdit).toBe(false);
        expect(renderHook(() => useFeedEditMode(active, true), { wrapper: wrap({ loaded: false }) }).result.current.canEdit).toBe(false);
    });
});
