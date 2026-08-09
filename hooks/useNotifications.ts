import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import type { NotificationResponseDto, NotificationUnreadCountDto } from '@/lib/api/types';

export const notificationKeys = {
    all: ['notifications'] as const,
    detail: (id: string) => ['notifications', id] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
};

// GET /api/notifications — always scoped to the caller's own inbox.
export function useNotifications() {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: notificationKeys.all,
        queryFn: async () => {
            const res = await api.get<NotificationResponseDto[]>(endpoints.notifications.list);
            return normalizeList(res).items;
        },
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
            const previous = queryClient.getQueryData<NotificationResponseDto[]>(notificationKeys.all);
            queryClient.setQueryData<NotificationResponseDto[]>(notificationKeys.all, (rows) =>
                rows?.map((row) => (row.id === id && !row.readAt ? { ...row, readAt: new Date().toISOString() } : row))
            );
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
