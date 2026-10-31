import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminKeys } from '@/hooks/useAdmin';
import { PARTNER_APPLICATIONS_PAGE_SIZE } from '@/lib/adminPartnerApplications';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type {
    AdminPartnerApplicationDto,
    ApprovePartnerApplicationResponseDto,
    PartnerApplicationStatus,
    PartnerProgramSummaryDto,
} from '@/lib/api/types';

export const partnerApplicationKeys = {
    all: ['admin', 'partnerApplications'] as const,
    list: (status: PartnerApplicationStatus | null, page: number) => ['admin', 'partnerApplications', 'list', status, page] as const,
    detail: (id: string) => ['admin', 'partnerApplications', 'detail', id] as const,
    pendingCount: ['admin', 'partnerApplications', 'pendingCount'] as const,
};

export const partnerProgramKeys = {
    summary: ['partnerProgram', 'summary'] as const,
};

export function usePartnerApplications(status: PartnerApplicationStatus | null, page: number) {
    return useQuery({
        queryKey: partnerApplicationKeys.list(status, page),
        queryFn: () =>
            api.get<Page<AdminPartnerApplicationDto>>(
                endpoints.admin.partnerApplications.list({ status, page, size: PARTNER_APPLICATIONS_PAGE_SIZE }),
            ),
        placeholderData: (previous) => previous,
    });
}

export function usePartnerApplication(id: string | null) {
    return useQuery({
        queryKey: partnerApplicationKeys.detail(id ?? ''),
        queryFn: () => api.get<AdminPartnerApplicationDto>(endpoints.admin.partnerApplications.byId(id!)),
        enabled: Boolean(id),
    });
}

// The sidebar badge: only the total is needed, so one row is fetched.
export function usePendingApplicationsCount(enabled = true): number {
    const query = useQuery({
        queryKey: partnerApplicationKeys.pendingCount,
        enabled,
        queryFn: async () => {
            const page = await api.get<Page<AdminPartnerApplicationDto>>(
                endpoints.admin.partnerApplications.list({ status: 'PENDING', page: 0, size: 1 }),
            );
            return page.page.totalElements;
        },
    });
    return query.data ?? 0;
}

export function usePartnerProgramSummary(enabled: boolean) {
    return useQuery({
        queryKey: partnerProgramKeys.summary,
        queryFn: () => api.get<PartnerProgramSummaryDto>(endpoints.partnerProgram.summary),
        enabled,
    });
}

export function useApprovePartnerApplication() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, founding }: { id: string; founding: boolean }) =>
            api.post<ApprovePartnerApplicationResponseDto>(endpoints.admin.partnerApplications.approve(id), { founding }),
        // Collaborations picks its partner from the list, so it must hold the new one before the
        // application refetch can swap the page; mutateAsync waits for this.
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: adminKeys.collaborators });
            queryClient.invalidateQueries({ queryKey: partnerApplicationKeys.all });
            queryClient.invalidateQueries({ queryKey: partnerProgramKeys.summary });
        },
    });
}

export function useDeclinePartnerApplication() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string | null }) =>
            api.post<AdminPartnerApplicationDto>(endpoints.admin.partnerApplications.decline(id), { reason }),
        onSuccess: (declined) => {
            queryClient.setQueryData(partnerApplicationKeys.detail(declined.id), declined);
            queryClient.invalidateQueries({ queryKey: partnerApplicationKeys.all });
        },
    });
}
