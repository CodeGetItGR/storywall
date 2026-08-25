import { type InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { NotificationResponseDto, NotificationUnreadCountDto } from '@/lib/api/types';

export const notificationKeys = {
    all: ['notifications'] as const,
    detail: (id: string) => ['notifications', id] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
};

const NOTIFICATIONS_PAGE_SIZE = 30;

// GET /api/notifications — always scoped to the caller's own inbox. Paginated, newest first.
export function useNotifications() {
    const { isAuthenticated } = useAuth();

    return useInfiniteQuery({
        queryKey: notificationKeys.all,
        queryFn: ({ pageParam }) =>
            api.get<Page<NotificationResponseDto>>(`${endpoints.notifications.list}?page=${pageParam}&size=${NOTIFICATIONS_PAGE_SIZE}`),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => (lastPage.number + 1 < lastPage.totalPages ? lastPage.number + 1 : undefined),
        enabled: isAuthenticated,
    });
}

// GET /api/notifications/unread-count — the badge source, cheap enough to poll.
export function useUnreadNotificationCount() {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: notificationKeys.unreadCount,
        queryFn: () => api.get<NotificationUnreadCountDto>(endpoints.notifications.unreadCount),
        enabled: isAuthenticated,
        select: (data) => data.unreadCount ?? data.count ?? 0,
    });
}

// PATCH /api/notifications/{id}/read
export function useMarkNotificationRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.patch<NotificationResponseDto>(endpoints.notifications.read(id)),
        // Optimistic: the row is already visually "read" the moment it is clicked,
        // and a failed call just leaves the server truth to the refetch below.
        onMutate: async (id: string) => {
            await queryClient.cancelQueries({ queryKey: notificationKeys.all });
            const previous = queryClient.getQueryData<InfiniteData<Page<NotificationResponseDto>>>(notificationKeys.all);
            queryClient.setQueryData<InfiniteData<Page<NotificationResponseDto>>>(notificationKeys.all, (data) => {
                if (!data) return data;
                return {
                    ...data,
                    pages: data.pages.map((page) => ({
                        ...page,
                        content: page.content.map((row) => (row.id === id && !row.readAt ? { ...row, readAt: new Date().toISOString() } : row)),
                    })),
                };
            });
            return { previous };
        },
        onError: (_error, _id, context) => {
            if (context?.previous) queryClient.setQueryData(notificationKeys.all, context.previous);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
            queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
        },
    });
}

// PATCH /api/notifications/read-all
export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => api.patch<void>(endpoints.notifications.readAll),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
            queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
        },
    });
}

export function useDeleteNotification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.notifications.byId(id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
            queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
        },
    });
}
