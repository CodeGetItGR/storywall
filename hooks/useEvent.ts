import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { myEventsKeys } from "@/hooks/useMyEvents";
import type { EventPatchDto, EventRequestDto, EventResponseDto } from "@/lib/api/types";

export const eventKeys = {
  all: ["events"] as const,
  detail: (id: string) => ["events", id] as const,
};

export function useEvent(eventId: string | null) {
  return useQuery({
    queryKey: eventKeys.detail(eventId ?? ""),
    queryFn: () => api.get<EventResponseDto>(endpoints.events.byId(eventId!)),
    enabled: Boolean(eventId),
  });
}

// POST /api/events — USER only. The backend is assumed to attach the caller
// as a HOST member of the new event (there's no separate "become host" step
// documented), so we just invalidate /api/me/events and let the caller pick
// the freshly created event up from there.
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EventRequestDto) => api.post<EventResponseDto>(endpoints.events.list, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myEventsKeys.all });
    },
  });
}

// PATCH /api/events/{id} — HOST of the event only. Partial update, no
// eventType (not editable server-side, see integration guide §8).
export function useUpdateEvent(eventId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EventPatchDto) => api.patch<EventResponseDto>(endpoints.events.byId(eventId!), input),
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) });
      queryClient.invalidateQueries({ queryKey: myEventsKeys.all });
    },
  });
}
