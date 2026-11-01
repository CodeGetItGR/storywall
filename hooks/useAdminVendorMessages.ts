'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { VendorContactMessageDto, VendorContactStatus } from '@/lib/api/types';

export const VENDOR_MESSAGES_PAGE_SIZE = 50;

export const adminVendorMessageKeys = {
    all: ['admin', 'vendor-messages'] as const,
    list: (status: VendorContactStatus | null, page: number) => ['admin', 'vendor-messages', 'list', status, page] as const,
    newCount: ['admin', 'vendor-messages', 'new-count'] as const,
};

export function useAdminVendorMessages(status: VendorContactStatus | null, page: number) {
    return useQuery({
        queryKey: adminVendorMessageKeys.list(status, page),
        queryFn: () => api.get<Page<VendorContactMessageDto>>(endpoints.admin.vendorMessages.list({ status, page, size: VENDOR_MESSAGES_PAGE_SIZE })),
        placeholderData: (previous) => previous,
    });
}

// The nav badge: messages nobody has answered yet.
export function useNewVendorMessagesCount(enabled = true): number {
    const query = useQuery({
        queryKey: adminVendorMessageKeys.newCount,
        enabled,
        queryFn: () => api.get<Page<VendorContactMessageDto>>(endpoints.admin.vendorMessages.list({ status: 'NEW', page: 0, size: 1 })),
    });
    return query.data?.page.totalElements ?? 0;
}

export function useSetVendorMessageStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: VendorContactStatus }) =>
            api.patch<VendorContactMessageDto>(endpoints.admin.vendorMessages.byId(id), { status }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: adminVendorMessageKeys.all }),
    });
}
