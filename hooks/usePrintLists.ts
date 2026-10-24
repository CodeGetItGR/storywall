'use client';

import { type QueryKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PrintListArchiveManifestDto, PrintListDto, PrintPicksContextDto } from '@/lib/api/types';
import { downloadBlob } from '@/lib/download';

// Print picks (spec 2026-10-23). Exported for the server prefetches, which seed the same keys.
export const printListKeys = {
    context: (eventId: string) => ['events', eventId, 'print-picks'] as const,
    host: (eventId: string, vendorId: string) => ['events', eventId, 'print-lists', 'host', vendorId] as const,
    mine: (eventId: string, vendorId: string) => ['events', eventId, 'print-lists', 'mine', vendorId] as const,
    guests: (eventId: string) => ['events', eventId, 'print-lists', 'guests'] as const,
};

export type PrintItemPatch = { sizeId?: string; copies?: number };

// Any member. Which photographers can receive picks now, their sizes, and the guest scope.
export function usePrintPicksContext(eventId: string | null) {
    const { isAuthenticated } = useAuth();
    const vendorsReadable = useModuleReadable(eventId, 'vendors');

    return useQuery({
        queryKey: printListKeys.context(eventId ?? ''),
        queryFn: () => api.get<PrintPicksContextDto>(endpoints.events.printPicks(eventId!)),
        enabled: Boolean(eventId) && isAuthenticated && vendorsReadable,
    });
}

// Hosts, and the photographer the list is for.
export function useHostPrintList(eventId: string | null, vendorId: string | null, enabled: boolean) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: printListKeys.host(eventId ?? '', vendorId ?? ''),
        queryFn: () => api.get<PrintListDto>(endpoints.events.hostPrintList(eventId!, vendorId!)),
        enabled: Boolean(eventId && vendorId) && enabled && isAuthenticated,
    });
}

export function useAddHostPrintItems(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (body: { vendorId: string; mediaIds: string[] }) => api.post<PrintListDto>(endpoints.events.hostPrintItems(eventId), body),
        onSuccess: (list, body) => queryClient.setQueryData(printListKeys.host(eventId, body.vendorId), list),
    });
}

// Size or copies of one pick, shown at once. listKey is the list the item is on (host or a guest's open list).
export function usePatchPrintItem(eventId: string, listKey: QueryKey) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ itemId, patch }: { itemId: string; patch: PrintItemPatch }) =>
            api.patch<PrintListDto>(endpoints.events.printItem(eventId, itemId), patch),
        onMutate: async ({ itemId, patch }) => {
            await queryClient.cancelQueries({ queryKey: listKey });
            const before = queryClient.getQueryData<PrintListDto>(listKey);
            if (before) {
                queryClient.setQueryData<PrintListDto>(listKey, {
                    ...before,
                    items: before.items.map((item) =>
                        item.id === itemId
                            ? {
                                  ...item,
                                  ...(patch.copies !== undefined && { copies: patch.copies }),
                                  ...(patch.sizeId !== undefined && { sizeId: patch.sizeId }),
                              }
                            : item,
                    ),
                });
            }
            return { before };
        },
        onError: (_error, _vars, context) => {
            if (context?.before) queryClient.setQueryData(listKey, context.before);
        },
        // The server's list carries the new size's label and price.
        onSuccess: (list) => queryClient.setQueryData(listKey, list),
    });
}

export function useRemovePrintItem(eventId: string, listKey: QueryKey) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (itemId: string) => api.del<PrintListDto>(endpoints.events.printItem(eventId, itemId)),
        onMutate: async (itemId) => {
            await queryClient.cancelQueries({ queryKey: listKey });
            const before = queryClient.getQueryData<PrintListDto>(listKey);
            if (before) queryClient.setQueryData<PrintListDto>(listKey, { ...before, items: before.items.filter((item) => item.id !== itemId) });
            return { before };
        },
        onError: (_error, _itemId, context) => {
            if (context?.before) queryClient.setQueryData(listKey, context.before);
        },
        onSuccess: (list) => queryClient.setQueryData(listKey, list),
    });
}

// The photographer sets what their package includes for the host.
export function useSetPrintsIncluded(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (count: number) => api.patch<void>(endpoints.events.vendorPrintsIncluded(eventId), { count }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: printListKeys.context(eventId) }),
    });
}

// The photographer downloads one list: every part of the manifest, one after the other.
export function useDownloadPrintList(eventId: string) {
    return useMutation({
        mutationFn: async ({ listId, fileStem }: { listId: string; fileStem: string }) => {
            const manifest = await api.get<PrintListArchiveManifestDto>(endpoints.events.printListArchiveManifest(eventId, listId));
            for (const { part } of manifest.parts) {
                const response = await api.download(endpoints.events.printListArchive(eventId, listId, part));
                const suffix = manifest.parts.length > 1 ? `-${part}` : '';
                downloadBlob(await response.blob(), `${fileStem}${suffix}.zip`);
            }
        },
    });
}
