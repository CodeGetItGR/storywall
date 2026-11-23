'use client';

import { type InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { businessKeys } from '@/hooks/useBusinessOverview';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { GuestInquiryDto } from '@/lib/api/types';

export const GUEST_INQUIRIES_PAGE_SIZE = 20;

// The partner's guest inquiries on My business, newest first, and the one open in the sheet. Read only for partners.
export function useGuestInquiries(enabled: boolean) {
    const queryClient = useQueryClient();
    const toErrorMessage = useApiErrorMessage();
    const [openId, setOpenId] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const query = useInfiniteQuery({
        queryKey: businessKeys.inquiries,
        queryFn: ({ pageParam }) => api.get<Page<GuestInquiryDto>>(endpoints.me.businessInquiries(pageParam, GUEST_INQUIRIES_PAGE_SIZE)),
        initialPageParam: 0,
        getNextPageParam: (last) => (last.page.number + 1 < last.page.totalPages ? last.page.number + 1 : undefined),
        enabled,
    });
    const save = useMutation({
        mutationFn: ({ id, done }: { id: string; done: boolean }) => api.patch<GuestInquiryDto>(endpoints.me.businessInquiry(id), { done }),
        onSuccess: (row) =>
            queryClient.setQueryData<InfiniteData<Page<GuestInquiryDto>>>(businessKeys.inquiries, (data) =>
                data
                    ? {
                          ...data,
                          pages: data.pages.map((page) => ({ ...page, content: page.content.map((item) => (item.id === row.id ? row : item)) })),
                      }
                    : data,
            ),
    });
    const inquiries = query.data?.pages.flatMap((page) => page.content) ?? [];

    const open = useCallback((id: string) => {
        setSaveError(null);
        setOpenId(id);
    }, []);
    const close = useCallback(() => setOpenId(null), []);
    const setDone = useCallback(
        async (done: boolean) => {
            if (!openId) return;
            setSaveError(null);
            try {
                await save.mutateAsync({ id: openId, done });
            } catch (error) {
                setSaveError(toErrorMessage(error));
            }
        },
        [openId, save, toErrorMessage],
    );

    return {
        inquiries,
        isLoading: query.isLoading,
        loadFailed: Boolean(query.error) && inquiries.length === 0,
        hasMore: Boolean(query.hasNextPage),
        isLoadingMore: query.isFetchingNextPage,
        loadMore: () => void query.fetchNextPage(),
        retry: () => void query.refetch(),
        selected: inquiries.find((item) => item.id === openId) ?? null,
        open,
        close,
        setDone,
        isSaving: save.isPending,
        saveError,
    };
}
