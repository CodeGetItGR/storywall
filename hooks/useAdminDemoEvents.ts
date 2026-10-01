import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { DemoEventDesignationRequestDto, DemoEventResponseDto } from '@/lib/api/types';

export const adminDemoEventKeys = {
    list: ['admin', 'demo-events'] as const,
};

// GET /api/admin/demo-events — one row per event type that has a demo.
export function useAdminDemoEvents(options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: adminDemoEventKeys.list,
        queryFn: () => api.get<DemoEventResponseDto[]>(endpoints.admin.demoEvents.list),
        enabled: options.enabled ?? true,
    });
}

// PUT /api/admin/demo-events/{eventTypeKey} — sets or replaces that type's demo.
export function useSetAdminDemoEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ eventTypeKey, input }: { eventTypeKey: string; input: DemoEventDesignationRequestDto }) =>
            api.put<DemoEventResponseDto>(endpoints.admin.demoEvents.byType(eventTypeKey), input),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: adminDemoEventKeys.list }),
    });
}

// DELETE /api/admin/demo-events/{eventTypeKey} — that type no longer has a demo.
export function useRemoveAdminDemoEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (eventTypeKey: string) => api.del<void>(endpoints.admin.demoEvents.byType(eventTypeKey)),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: adminDemoEventKeys.list }),
    });
}
