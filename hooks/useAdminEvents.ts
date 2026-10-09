import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type AdminEventFilters, adminEventsPath } from '@/lib/adminEvents';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { Page } from '@/lib/api/pagination';
import type {
    AdminEventCloseRequestDto,
    AdminEventDetailDto,
    AdminEventSummaryDto,
    AdminEventSuspendRequestDto,
    AdminMemberGrantRequestDto,
    AdminModuleConfigOverrideRequestDto,
    AdminStorageGrantRequestDto,
    EventUsageResponseDto,
    ModerationDecisionDto,
} from '@/lib/api/types';

export const adminEventKeys = {
    all: ['admin', 'events'] as const,
    list: (filters: AdminEventFilters, page: number, size: number) => ['admin', 'events', 'list', filters, page, size] as const,
    detail: (eventId: string) => ['admin', 'events', 'detail', eventId] as const,
};

// Rows carry hosts' names and emails: nothing is kept once the screen showing them is gone.
const NO_RETENTION = { gcTime: 0 } as const;

export function useAdminEvents({ filters, page, size, enabled = true }: { filters: AdminEventFilters; page: number; size: number; enabled?: boolean }) {
    return useQuery({
        queryKey: adminEventKeys.list(filters, page, size),
        queryFn: () => api.get<Page<AdminEventSummaryDto>>(adminEventsPath(filters, page, size)),
        enabled,
        placeholderData: (previous) => previous,
        ...NO_RETENTION,
    });
}

export function useAdminEvent(eventId: string | null) {
    return useQuery({
        queryKey: adminEventKeys.detail(eventId ?? ''),
        queryFn: () => api.get<AdminEventDetailDto>(endpoints.admin.events.byId(eventId ?? '')),
        enabled: Boolean(eventId),
        retry: false,
        ...NO_RETENTION,
    });
}

// Grants answer with the updated event, so the page takes it as is; the list may show other columns, so it is re-read.
function useEventDetailMutation<TInput>(eventId: string, request: (input: TInput) => Promise<AdminEventDetailDto>) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: request,
        onSuccess: (event) => {
            queryClient.setQueryData(adminEventKeys.detail(eventId), event);
            void queryClient.invalidateQueries({ queryKey: [...adminEventKeys.all, 'list'] });
        },
    });
}

export function useSetEventStorageGrant(eventId: string) {
    return useEventDetailMutation(eventId, (input: AdminStorageGrantRequestDto) =>
        api.put<AdminEventDetailDto>(endpoints.admin.events.storageGrant(eventId), input),
    );
}

export function useSetEventMemberSlots(eventId: string) {
    return useEventDetailMutation(eventId, (input: AdminMemberGrantRequestDto) =>
        api.put<AdminEventDetailDto>(endpoints.admin.events.memberGrant(eventId), input),
    );
}

export function useGrantEventModule(eventId: string) {
    return useEventDetailMutation(eventId, ({ moduleKey, reason }: { moduleKey: string; reason: string }) =>
        api.put<AdminEventDetailDto>(endpoints.admin.events.moduleGrant(eventId, moduleKey), { reason }),
    );
}

export function useRevokeEventModule(eventId: string) {
    return useEventDetailMutation(eventId, (moduleKey: string) => api.del<AdminEventDetailDto>(endpoints.admin.events.moduleGrant(eventId, moduleKey)));
}

type ModuleConfigTarget = { moduleKey: string; configKey: string };

export function useSetEventModuleConfig(eventId: string) {
    return useEventDetailMutation(eventId, ({ moduleKey, configKey, ...input }: ModuleConfigTarget & AdminModuleConfigOverrideRequestDto) =>
        api.put<AdminEventDetailDto>(endpoints.admin.events.moduleConfig(eventId, moduleKey, configKey), input),
    );
}

export function useResetEventModuleConfig(eventId: string) {
    return useEventDetailMutation(eventId, ({ moduleKey, configKey, reason }: ModuleConfigTarget & { reason: string }) =>
        api.post<AdminEventDetailDto>(endpoints.admin.events.moduleConfigReset(eventId, moduleKey, configKey), { reason }),
    );
}

// Every action below answers without the event: the page re-reads it, whether the action went
// through or was refused because another admin changed the event first.
function useEventRefetchingMutation<TInput, TResult>(request: (input: TInput) => Promise<TResult>) {
    const queryClient = useQueryClient();
    const refresh = () => queryClient.invalidateQueries({ queryKey: adminEventKeys.all });
    return useMutation({ mutationFn: request, onSuccess: refresh, onError: refresh });
}

export function useSuspendEvent(eventId: string) {
    return useEventRefetchingMutation((input: AdminEventSuspendRequestDto) =>
        api.post<ModerationDecisionDto>(endpoints.admin.events.suspend(eventId), input),
    );
}

export function useCloseEvent(eventId: string) {
    return useEventRefetchingMutation((input: AdminEventCloseRequestDto) =>
        api.post<ModerationDecisionDto>(endpoints.admin.events.close(eventId), input),
    );
}

// 5111 means another admin lifted it first: treated as done.
export function useLiftEventSuspensionById(eventId: string) {
    return useEventRefetchingMutation<void, void>(async () => {
        try {
            await api.del<void>(endpoints.adminModeration.eventSuspension(eventId));
        } catch (error) {
            if (getErrorCode(error) !== ERROR_CODES.EVENT_NOT_SUSPENDED) throw error;
        }
    });
}

export function useChangeEventPlan(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (planTierCode: string) => api.patch<EventUsageResponseDto>(endpoints.admin.events.planTier(eventId), { planTierCode }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: adminEventKeys.all });
            void queryClient.invalidateQueries({ queryKey: ['events', eventId] });
        },
    });
}

export function useRemoveAdminEventAddon(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (code: string) => api.del<void>(endpoints.admin.events.addon(eventId, code)),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: adminEventKeys.all });
            void queryClient.invalidateQueries({ queryKey: ['events', eventId, 'billing'] });
        },
    });
}
