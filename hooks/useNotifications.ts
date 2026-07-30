import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeList } from "@/lib/api/pagination";
import type { NotificationRequestDto, NotificationResponseDto } from "@/lib/api/types";
import { useAuth } from "@/hooks/useAuth";

export const notificationKeys = {
  all: ["notifications"] as const,
  detail: (id: string) => ["notifications", id] as const,
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

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NotificationRequestDto) =>
      api.post<NotificationResponseDto>(endpoints.notifications.list, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// There is no "mark as read" endpoint — readAt is a full field with no PATCH
// route for notifications (see integration guide §4). Delete is the only
// other mutation available.
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.del<void>(endpoints.notifications.byId(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
