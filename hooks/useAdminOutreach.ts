import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type {
    OutreachNoteDto,
    OutreachProspectCreateRequestDto,
    OutreachProspectDto,
    OutreachProspectQuery,
    OutreachProspectRowDto,
    OutreachProspectUpdateRequestDto,
    OutreachSummaryDto,
} from '@/lib/api/types';

export const outreachKeys = {
    all: ['admin', 'outreach'] as const,
    summary: ['admin', 'outreach', 'summary'] as const,
    lists: ['admin', 'outreach', 'list'] as const,
    list: (query: OutreachProspectQuery) => ['admin', 'outreach', 'list', query] as const,
    detail: (id: string) => ['admin', 'outreach', 'detail', id] as const,
};

export function useOutreachSummary() {
    return useQuery({
        queryKey: outreachKeys.summary,
        queryFn: () => api.get<OutreachSummaryDto>(endpoints.admin.outreach.summary),
    });
}

export function useOutreachProspects(query: OutreachProspectQuery) {
    return useQuery({
        queryKey: outreachKeys.list(query),
        queryFn: () => api.get<Page<OutreachProspectRowDto>>(endpoints.admin.outreach.prospects(query)),
        placeholderData: (previous) => previous,
    });
}

export function useOutreachProspect(id: string | null) {
    return useQuery({
        queryKey: outreachKeys.detail(id ?? ''),
        queryFn: () => api.get<OutreachProspectDto>(endpoints.admin.outreach.byId(id!)),
        enabled: Boolean(id),
    });
}

// Any change can move a business between filters and summary counts, so both are refetched.
function useRefreshOutreachLists() {
    const queryClient = useQueryClient();
    return () => {
        void queryClient.invalidateQueries({ queryKey: outreachKeys.summary });
        void queryClient.invalidateQueries({ queryKey: outreachKeys.lists });
    };
}

export function useCreateOutreachProspect() {
    const queryClient = useQueryClient();
    const refresh = useRefreshOutreachLists();
    return useMutation({
        mutationFn: (request: OutreachProspectCreateRequestDto) => api.post<OutreachProspectDto>(endpoints.admin.outreach.create, request),
        onSuccess: (created) => {
            queryClient.setQueryData(outreachKeys.detail(created.id), created);
            refresh();
        },
    });
}

export function useUpdateOutreachProspect() {
    const queryClient = useQueryClient();
    const refresh = useRefreshOutreachLists();
    return useMutation({
        mutationFn: ({ id, patch }: { id: string; patch: OutreachProspectUpdateRequestDto }) =>
            api.patch<OutreachProspectDto>(endpoints.admin.outreach.byId(id), patch),
        onSuccess: (updated) => {
            queryClient.setQueryData(outreachKeys.detail(updated.id), updated);
            refresh();
        },
    });
}

export function useDeleteOutreachProspect() {
    const queryClient = useQueryClient();
    const refresh = useRefreshOutreachLists();
    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.outreach.byId(id)),
        onSuccess: (_result, id) => {
            queryClient.removeQueries({ queryKey: outreachKeys.detail(id) });
            refresh();
        },
    });
}

// A note only changes the business's own activity list.
export function useAddOutreachNote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: string }) => api.post<OutreachNoteDto>(endpoints.admin.outreach.notes(id), { body }),
        onSuccess: (_note, { id }) => queryClient.invalidateQueries({ queryKey: outreachKeys.detail(id) }),
    });
}
