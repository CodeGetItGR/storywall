'use client';

import type { InfiniteData } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { wishbookKeys } from '@/hooks/useWishbook';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { isNotFoundError } from '@/lib/api/errors';
import type { Page } from '@/lib/api/pagination';
import type { WishbookBookDto, WishbookBookTextsDto, WishbookBookTextsRequestDto, WishbookEntryResponseDto } from '@/lib/api/types';

const POLL_MS = 3000;

export const wishbookBookKeys = {
    book: (eventId: string) => ['events', eventId, 'wishbook-book'] as const,
    texts: (eventId: string) => ['events', eventId, 'wishbook-book', 'texts'] as const,
};

export function bookRefetchInterval(book: WishbookBookDto | null | undefined): number | false {
    return book && (book.status === 'QUEUED' || book.status === 'RUNNING') ? POLL_MS : false;
}

// Host-only. null = never built (the backend answers 404).
export function useWishbookBook(eventId: string, isHost: boolean) {
    const { isAuthenticated } = useAuth();
    const readable = useModuleReadable(eventId, 'wishbook');
    return useQuery({
        queryKey: wishbookBookKeys.book(eventId),
        queryFn: async () => {
            try {
                return await api.get<WishbookBookDto>(endpoints.events.wishbookBook(eventId));
            } catch (error) {
                if (isNotFoundError(error)) return null;
                throw error;
            }
        },
        enabled: Boolean(eventId) && isAuthenticated && readable && isHost,
        // The guide relies on a read on every load: a co-host's rebuild or a CONTENT_CHANGED takedown only shows up there.
        staleTime: 0,
        // A failing endpoint must not be hammered every 3 s on the cached QUEUED.
        refetchInterval: (query) => (query.state.status === 'error' ? false : bookRefetchInterval(query.state.data)),
    });
}

export function useRequestWishbookBook(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => api.post<WishbookBookDto>(endpoints.events.wishbookBook(eventId)),
        // A poll still in flight would land after the POST and overwrite the new build with the old one.
        onMutate: () => queryClient.cancelQueries({ queryKey: wishbookBookKeys.book(eventId), exact: true }),
        onSuccess: (book) => queryClient.setQueryData(wishbookBookKeys.book(eventId), book),
    });
}

// The presigned URL expires: ask for a fresh one at click time.
export function useFreshBookDownloadUrl(eventId: string) {
    const queryClient = useQueryClient();
    return async () => {
        const book = await api.get<WishbookBookDto>(endpoints.events.wishbookBook(eventId));
        queryClient.setQueryData(wishbookBookKeys.book(eventId), book);
        return book.downloadUrl;
    };
}

export function useWishbookBookTexts(eventId: string, enabled: boolean) {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: wishbookBookKeys.texts(eventId),
        queryFn: () => api.get<WishbookBookTextsDto>(endpoints.events.wishbookBookTexts(eventId)),
        enabled: Boolean(eventId) && isAuthenticated && enabled,
        // A co-host may have saved new texts since this cache entry was filled.
        staleTime: 0,
    });
}

export function useSaveWishbookBookTexts(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: WishbookBookTextsRequestDto) => api.put<WishbookBookTextsDto>(endpoints.events.wishbookBookTexts(eventId), input),
        onSuccess: (texts) => queryClient.setQueryData(wishbookBookKeys.texts(eventId), texts),
    });
}

type EntryPages = InfiniteData<Page<WishbookEntryResponseDto>>;

export function useSetWishHighlighted(eventId: string) {
    const queryClient = useQueryClient();
    const listKey = wishbookKeys.list(eventId);
    const mutationKey = ['wishbook-highlight', eventId] as const;
    const setHighlighted = (entryId: string, highlighted: boolean) =>
        queryClient.setQueryData<EntryPages>(listKey, (data) =>
            data
                ? {
                      ...data,
                      pages: data.pages.map((page) => ({
                          ...page,
                          content: page.content.map((entry) => (entry.id === entryId ? { ...entry, highlighted } : entry)),
                      })),
                  }
                : data,
        );
    return useMutation({
        mutationKey,
        mutationFn: ({ entryId, highlighted }: { entryId: string; highlighted: boolean }) =>
            highlighted ? api.put<void>(endpoints.wishbook.highlight(entryId)) : api.del<void>(endpoints.wishbook.highlight(entryId)),
        onMutate: async ({ entryId, highlighted }) => {
            // Exact: the prefix would also cancel the count query.
            await queryClient.cancelQueries({ queryKey: listKey, exact: true });
            setHighlighted(entryId, highlighted);
        },
        // Undo only this wish: restoring a whole snapshot would also undo a later toggle that succeeded.
        onError: (_error, { entryId, highlighted }) => {
            setHighlighted(entryId, !highlighted);
        },
        // Refetch once the last overlapping toggle is done; an earlier refetch could miss a request still in flight.
        // This mutation still counts as mutating while its own onSettled runs.
        onSettled: () => {
            if (queryClient.isMutating({ mutationKey }) === 1) return queryClient.invalidateQueries({ queryKey: listKey, exact: true });
        },
    });
}
