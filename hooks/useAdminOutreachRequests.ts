import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { outreachKeys } from '@/hooks/useAdminOutreach';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { OutreachRequestCreateDto, OutreachRequestDto, OutreachRequestStatus } from '@/lib/api/types';

export const outreachRequestKeys = {
    all: ['admin', 'outreach-requests'] as const,
    pendingCount: ['admin', 'outreach-requests', 'pending-count'] as const,
    list: (status: OutreachRequestStatus | null) => ['admin', 'outreach-requests', 'list', status] as const,
};

export function useOutreachRequests(status: OutreachRequestStatus | null) {
    return useQuery({
        queryKey: outreachRequestKeys.list(status),
        queryFn: () => api.get<Page<OutreachRequestDto>>(endpoints.admin.outreach.requests.list(status)),
        placeholderData: (previous) => previous,
    });
}

// The nav badge: requests waiting for an admin.
export function usePendingOutreachRequestsCount(enabled = true): number {
    const query = useQuery({
        queryKey: outreachRequestKeys.pendingCount,
        enabled,
        queryFn: () => api.get<{ count: number }>(endpoints.admin.outreach.requests.pendingCount),
    });
    return query.data?.count ?? 0;
}

export function useCreateOutreachRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (request: OutreachRequestCreateDto) => api.post<OutreachRequestDto>(endpoints.admin.outreach.requests.create, request),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: outreachRequestKeys.all }),
    });
}

export type OutreachDecision = 'approve' | 'decline';

// An approval adds or removes a business, so the pipeline is refetched too.
export function useDecideOutreachRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, decision, note }: { id: string; decision: OutreachDecision; note: string }) =>
            api.post<OutreachRequestDto>(endpoints.admin.outreach.requests[decision](id), { note: note.trim() || null }),
        onSuccess: (_decided, { decision }) => {
            void queryClient.invalidateQueries({ queryKey: outreachRequestKeys.all });
            if (decision === 'approve') void queryClient.invalidateQueries({ queryKey: outreachKeys.all });
        },
    });
}
