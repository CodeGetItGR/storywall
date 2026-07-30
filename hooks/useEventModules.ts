import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeList } from "@/lib/api/pagination";
import type { EventModulePatchDto, EventModuleRequestDto, EventModuleResponseDto } from "@/lib/api/types";

export const eventModuleKeys = {
  list: (eventId: string) => ["events", eventId, "modules"] as const,
};

// GET /api/events/{eventId}/modules — feature toggles per event
// (e.g. "is the playlist module enabled"). Any member of the event.
export function useEventModules(eventId: string | null) {
  return useQuery({
    queryKey: eventModuleKeys.list(eventId ?? ""),
    queryFn: async () => {
      const res = await api.get<EventModuleResponseDto[]>(endpoints.events.modules(eventId!));
      return normalizeList(res).items;
    },
    enabled: Boolean(eventId),
  });
}

// POST /api/event-modules — HOST of dto.eventId.
export function useCreateEventModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EventModuleRequestDto) =>
      api.post<EventModuleResponseDto>(endpoints.eventModules.create, input),
    onSuccess: (module_) => {
      queryClient.invalidateQueries({ queryKey: eventModuleKeys.list(module_.eventId) });
    },
  });
}

// PATCH /api/event-modules/{id} — HOST of the event. This is now how you
// toggle a module on/off (no more delete + recreate).
export function useUpdateEventModule(id: string, eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EventModulePatchDto) =>
      api.patch<EventModuleResponseDto>(endpoints.eventModules.byId(id), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventModuleKeys.list(eventId) });
    },
  });
}

export function useDeleteEventModule(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.del<void>(endpoints.eventModules.byId(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventModuleKeys.list(eventId) });
    },
  });
}
