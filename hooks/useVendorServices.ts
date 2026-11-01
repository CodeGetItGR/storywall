import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { isEventPrintKey } from '@/hooks/usePrintLists';
import { isAccountRole } from '@/lib/accountRole';
import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { VendorServiceItemDto, VendorServiceItemRequestDto } from '@/lib/api/types';

export const vendorServiceKeys = {
    mine: ['me', 'vendor-profile', 'services'] as const,
};

// Prices show in every event's print context and on open print lists (prices are live), so a change refreshes all of them.
function refreshPrintQueries(queryClient: QueryClient) {
    return queryClient.invalidateQueries({ predicate: (query) => isEventPrintKey(query.queryKey) });
}

function bySortOrder(a: VendorServiceItemDto, b: VendorServiceItemDto) {
    return a.sortOrder - b.sortOrder;
}

// Writes the server's answer into the list, after any fetch already running (it would land later and hide the change).
async function writeServices(queryClient: QueryClient, update: (services: VendorServiceItemDto[]) => VendorServiceItemDto[]) {
    await queryClient.cancelQueries({ queryKey: vendorServiceKeys.mine, exact: true });
    queryClient.setQueryData<VendorServiceItemDto[]>(vendorServiceKeys.mine, (services) => (services ? update(services) : services));
}

// A failed save may mean the list is out of date (a size gone, a partner no longer approved): read it again.
function rereadServices(queryClient: QueryClient) {
    return queryClient.invalidateQueries({ queryKey: vendorServiceKeys.mine, exact: true });
}

// The caller's priced services. Enable for approved-partner photographers; saving answers 403 PARTNER_REQUIRED otherwise.
export function useVendorServices(enabled: boolean) {
    const { user } = useAuth();
    // Guest accounts have no /api/me profile, so they never ask.
    const canHaveProfile = isAccountRole(user?.role);

    return useQuery({
        queryKey: vendorServiceKeys.mine,
        queryFn: () => api.get<VendorServiceItemDto[]>(endpoints.me.vendorServices),
        enabled: enabled && canHaveProfile,
    });
}

export function useCreateVendorService() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (body: VendorServiceItemRequestDto) => api.post<VendorServiceItemDto>(endpoints.me.vendorServices, body),
        onSuccess: async (created) => {
            await writeServices(queryClient, (services) => [...services.filter((service) => service.id !== created.id), created].sort(bySortOrder));
            await refreshPrintQueries(queryClient);
        },
        onError: () => rereadServices(queryClient),
    });
}

export function useUpdateVendorService() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: VendorServiceItemRequestDto }) =>
            api.put<VendorServiceItemDto>(endpoints.me.vendorService(id), body),
        onSuccess: async (updated) => {
            await writeServices(queryClient, (services) =>
                services.map((service) => (service.id === updated.id ? updated : service)).sort(bySortOrder),
            );
            await refreshPrintQueries(queryClient);
        },
        onError: () => rereadServices(queryClient),
    });
}

// Not optimistic: the delete sits behind a confirmation.
export function useDeleteVendorService() {
    const queryClient = useQueryClient();
    const dropRow = (id: string) => writeServices(queryClient, (services) => services.filter((service) => service.id !== id));

    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.me.vendorService(id)),
        onSuccess: async (_data, id) => {
            await dropRow(id);
            await refreshPrintQueries(queryClient);
        },
        // A 404 means the size is already gone, so the row goes either way.
        onError: async (error, id) => {
            if (error instanceof ApiError && error.status === 404) await dropRow(id);
            await rereadServices(queryClient);
        },
    });
}
