'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminKeys } from '@/hooks/useAdmin';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { eventTypeModuleKeys } from '@/hooks/useEventTypeModules';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventTypeModulePatchDto, EventTypeModuleResponseDto } from '@/lib/api/types';

// GET /api/admin/event-types/{key}/modules — every row including UNSUPPORTED.
export function useEventTypeModuleMatrix(eventTypeKey: string | null) {
    return useQuery({
        queryKey: adminKeys.eventTypeModules(eventTypeKey ?? ''),
        queryFn: () => api.get<EventTypeModuleResponseDto[]>(endpoints.admin.eventTypes.modules(eventTypeKey!)),
        enabled: Boolean(eventTypeKey),
    });
}

export function useUpdateEventTypeModule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ eventTypeKey, moduleKey, input }: { eventTypeKey: string; moduleKey: string; input: EventTypeModulePatchDto }) =>
            api.patch<EventTypeModuleResponseDto>(endpoints.admin.eventTypes.module(eventTypeKey, moduleKey), input),
        onSuccess: (_result, { eventTypeKey }) => {
            queryClient.invalidateQueries({ queryKey: adminKeys.eventTypeModules(eventTypeKey) });
            queryClient.invalidateQueries({ queryKey: eventTypeModuleKeys.list(eventTypeKey) });
            queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
        },
    });
}
