import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeList } from "@/lib/api/pagination";
import type { SessionResponseDto } from "@/lib/api/types";
import { useAuth } from "@/hooks/useAuth";

export const sessionKeys = {
  all: ["sessions"] as const,
};

// GET /api/sessions — the caller's own device/session list, for a
// "log out other devices" screen. Not to be confused with EventSession
// (sub-events within an event) in useEventSessions.ts.
export function useSessions() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: sessionKeys.all,
    queryFn: async () => {
      const res = await api.get<SessionResponseDto[]>(endpoints.sessions.list);
      return normalizeList(res).items;
    },
    enabled: isAuthenticated,
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.del<void>(endpoints.sessions.byId(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}
