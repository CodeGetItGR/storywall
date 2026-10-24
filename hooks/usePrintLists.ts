'use client';

import { type QueryClient, type QueryKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { attachmentFilename } from '@/lib/adminOrders';
import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { PrintItemPatch, PrintListArchiveManifestDto, PrintListDto, PrintListItemDto, PrintPicksContextDto } from '@/lib/api/types';
import { downloadBlob } from '@/lib/download';
import { LIVE_CONTENT_STALE_TIME } from '@/lib/queryClient';

// Print picks (spec 2026-10-23). Exported for the server prefetches, which seed the same keys.
export const printListKeys = {
    context: (eventId: string) => ['events', eventId, 'print-picks'] as const,
    host: (eventId: string, vendorId: string) => ['events', eventId, 'print-lists', 'host', vendorId] as const,
    mine: (eventId: string, vendorId: string) => ['events', eventId, 'print-lists', 'mine', vendorId] as const,
    guests: (eventId: string) => ['events', eventId, 'print-lists', 'guests'] as const,
    archive: (eventId: string, listId: string) => ['events', eventId, 'print-lists', 'archive', listId] as const,
};

// Every print query of every event: the context and all lists (archive manifests included, they carry list contents).
export function isEventPrintKey(queryKey: QueryKey): boolean {
    return queryKey[0] === 'events' && (queryKey[2] === 'print-picks' || queryKey[2] === 'print-lists');
}

type ItemFields = Pick<PrintListItemDto, 'copies' | 'sizeId' | 'sizeLabel' | 'unitPriceCents'>;

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
        // The photographer reads the list the host edits.
        staleTime: LIVE_CONTENT_STALE_TIME,
    });
}

// Patches and removals on one list share this key, and adds count with them (see writesRunning),
// so the last write running can tell it is the last.
const itemMutationKey = (listKey: QueryKey) => [...listKey, 'item'] as const;
const addMutationKey = (eventId: string) => ['events', eventId, 'print-lists', 'host', 'add'] as const;

// Writes to one host list that are running now: item edits on it, and adds (to any list of the event, which is the safe side).
function writesRunning(queryClient: QueryClient, eventId: string, listKey: QueryKey): number {
    return queryClient.isMutating({ mutationKey: itemMutationKey(listKey) }) + queryClient.isMutating({ mutationKey: addMutationKey(eventId) });
}

// A photographer whose access has ended must stop being offered.
function refreshContextIfAccessEnded(queryClient: QueryClient, eventId: string, error: unknown) {
    if (getErrorCode(error) === ERROR_CODES.VENDOR_ACCESS_ENDED) {
        return queryClient.invalidateQueries({ queryKey: printListKeys.context(eventId), exact: true });
    }
}

export function useAddHostPrintItems(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: addMutationKey(eventId),
        mutationFn: (body: { vendorId: string; mediaIds: string[] }) => api.post<PrintListDto>(endpoints.events.hostPrintItems(eventId), body),
        onSuccess: async (list, body) => {
            const key = printListKeys.host(eventId, body.vendorId);
            // A fetch started before the add would land after it and hide the new picks.
            await queryClient.cancelQueries({ queryKey: key, exact: true });
            // Another write still running (this one is counted too) would be overwritten by this list: refetch instead.
            if (writesRunning(queryClient, eventId, key) > 1) {
                await queryClient.invalidateQueries({ queryKey: key, exact: true });
                return;
            }
            queryClient.setQueryData(key, list);
        },
        onError: (error) => refreshContextIfAccessEnded(queryClient, eventId, error),
    });
}

function updateItem(queryClient: QueryClient, listKey: QueryKey, itemId: string, fields: Partial<ItemFields>) {
    queryClient.setQueryData<PrintListDto>(listKey, (list) =>
        list ? { ...list, items: list.items.map((item) => (item.id === itemId ? { ...item, ...fields } : item)) } : list,
    );
}

// Size or copies of one pick, shown at once. listKey is the list the item is on (host or a guest's open list).
export function usePatchPrintItem(eventId: string, listKey: QueryKey) {
    const queryClient = useQueryClient();
    const mutationKey = itemMutationKey(listKey);
    // This mutation still counts as mutating while its own callbacks run.
    const isLast = () => writesRunning(queryClient, eventId, listKey) === 1;

    return useMutation({
        mutationKey,
        mutationFn: ({ itemId, patch }: { itemId: string; patch: PrintItemPatch }) =>
            api.patch<PrintListDto>(endpoints.events.printItem(eventId, itemId), patch),
        onMutate: async ({ itemId, patch }) => {
            await queryClient.cancelQueries({ queryKey: listKey, exact: true });
            const item = queryClient.getQueryData<PrintListDto>(listKey)?.items.find((entry) => entry.id === itemId);
            const previous: Partial<ItemFields> = {};
            if (item && patch.copies !== undefined) previous.copies = item.copies;
            if (item && patch.sizeId !== undefined) {
                Object.assign(previous, { sizeId: item.sizeId, sizeLabel: item.sizeLabel, unitPriceCents: item.unitPriceCents });
            }
            updateItem(queryClient, listKey, itemId, {
                ...(patch.copies !== undefined && { copies: patch.copies }),
                ...(patch.sizeId !== undefined && { sizeId: patch.sizeId }),
            });
            return { previous };
        },
        // Undo only this change: a whole-list snapshot could bring back a pick another mutation already removed.
        onError: (error, { itemId }, context) => {
            if (context) updateItem(queryClient, listKey, itemId, context.previous);
            return refreshContextIfAccessEnded(queryClient, eventId, error);
        },
        // The server's list carries the new size's label and price. An answer must not overwrite a later change still running.
        onSuccess: (list) => {
            if (isLast()) queryClient.setQueryData(listKey, list);
        },
        onSettled: () => {
            if (isLast()) return queryClient.invalidateQueries({ queryKey: listKey, exact: true });
        },
    });
}

export function useRemovePrintItem(eventId: string, listKey: QueryKey) {
    const queryClient = useQueryClient();
    const mutationKey = itemMutationKey(listKey);
    const isLast = () => writesRunning(queryClient, eventId, listKey) === 1;

    return useMutation({
        mutationKey,
        mutationFn: (itemId: string) => api.del<PrintListDto>(endpoints.events.printItem(eventId, itemId)),
        onMutate: async (itemId) => {
            await queryClient.cancelQueries({ queryKey: listKey, exact: true });
            const items = queryClient.getQueryData<PrintListDto>(listKey)?.items ?? [];
            const index = items.findIndex((item) => item.id === itemId);
            queryClient.setQueryData<PrintListDto>(listKey, (list) =>
                list ? { ...list, items: list.items.filter((item) => item.id !== itemId) } : list,
            );
            return { removed: index >= 0 ? items[index] : null, index };
        },
        // Put back only this pick, where it was. A 404 means it is already gone, so the removal stands.
        onError: (error, _itemId, context) => {
            void refreshContextIfAccessEnded(queryClient, eventId, error);
            if (error instanceof ApiError && error.status === 404) return;
            const removed = context?.removed;
            if (!removed) return;
            queryClient.setQueryData<PrintListDto>(listKey, (list) => {
                if (!list || list.items.some((item) => item.id === removed.id)) return list;
                const items = [...list.items];
                items.splice(Math.min(context.index, items.length), 0, removed);
                return { ...list, items };
            });
        },
        onSuccess: (list) => {
            if (isLast()) queryClient.setQueryData(listKey, list);
        },
        onSettled: () => {
            if (isLast()) return queryClient.invalidateQueries({ queryKey: listKey, exact: true });
        },
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

// The parts of one list's zip. Empty `parts` means nothing to download. Photographer only.
export function usePrintListManifest(eventId: string | null, listId: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: printListKeys.archive(eventId ?? '', listId ?? ''),
        queryFn: () => api.get<PrintListArchiveManifestDto>(endpoints.events.printListArchiveManifest(eventId!, listId!)),
        enabled: Boolean(eventId && listId) && isAuthenticated,
        retry: false,
    });
}

// Downloads one part of a list's zip. The file keeps the server's name; fileStem is the fallback.
export function useDownloadPrintListPart(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ listId, part, fileStem }: { listId: string; part: number; fileStem: string }) => {
            const response = await api.download(endpoints.events.printListArchive(eventId, listId, part));
            const blob = await response.blob();
            downloadBlob(blob, attachmentFilename(response.headers.get('Content-Disposition'), `${fileStem}-${part}.zip`));
        },
        // The list changed since the manifest was read: show the current parts.
        onError: (error, { listId }) => {
            if (getErrorCode(error) === ERROR_CODES.MEDIA_ARCHIVE_PART_NOT_FOUND) {
                return queryClient.invalidateQueries({ queryKey: printListKeys.archive(eventId, listId), exact: true });
            }
        },
    });
}
