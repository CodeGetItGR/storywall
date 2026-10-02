import { useQuery } from '@tanstack/react-query';

import { type AdminOrderFilters, adminOrdersPath } from '@/lib/adminOrders';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { AdminOrderDetailDto, AdminOrderSummaryDto } from '@/lib/api/types';

export const adminOrderKeys = {
    all: ['admin', 'orders'] as const,
    list: (filters: AdminOrderFilters, page: number, size: number) => ['admin', 'orders', 'list', filters, page, size] as const,
    detail: (orderId: string) => ['admin', 'orders', 'detail', orderId] as const,
};

// Order rows and pages carry buyers' names, emails and business details: nothing is
// kept in the cache once the screen showing them is gone.
const NO_RETENTION = { gcTime: 0 } as const;

export function useAdminOrders({
    filters,
    page,
    size,
    enabled = true,
}: {
    filters: AdminOrderFilters;
    page: number;
    size: number;
    enabled?: boolean;
}) {
    return useQuery({
        queryKey: adminOrderKeys.list(filters, page, size),
        queryFn: () => api.get<Page<AdminOrderSummaryDto>>(adminOrdersPath(filters, page, size)),
        enabled,
        placeholderData: (previous) => previous,
        ...NO_RETENTION,
    });
}

export function useAdminOrder(orderId: string | null) {
    return useQuery({
        queryKey: adminOrderKeys.detail(orderId ?? ''),
        queryFn: () => api.get<AdminOrderDetailDto>(endpoints.admin.orders.byId(orderId ?? '')),
        enabled: Boolean(orderId),
        retry: false,
        ...NO_RETENTION,
    });
}
