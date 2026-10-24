'use client';

import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCreateVendorService, useDeleteVendorService, useUpdateVendorService, useVendorServices } from '@/hooks/useVendorServices';
import type { VendorMeDto, VendorServiceItemDto } from '@/lib/api/types';
import { PRINT_SIZES_MAX } from '@/lib/printPicks';

// The Services section: print sizes for approved-partner photographers, one line for other photographers.
export function useVendorServicesSection(me: VendorMeDto | null) {
    const toErrorMessage = useApiErrorMessage();
    const isPhotographer = me?.vendorType === 'PHOTOGRAPHER';
    const approved = Boolean(me?.approvedPartner);
    const services = useVendorServices(isPhotographer && approved);
    const create = useCreateVendorService();
    const update = useUpdateVendorService();
    const remove = useDeleteVendorService();
    // null: closed; 'new': adding; an item: editing it.
    const [editing, setEditing] = useState<VendorServiceItemDto | 'new' | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sizes = (services.data ?? []).filter((item) => item.kind === 'PRINT');

    const save = useCallback(
        async (label: string, priceCents: number) => {
            setError(null);
            try {
                if (editing === 'new') await create.mutateAsync({ kind: 'PRINT', label, priceCents });
                else if (editing)
                    await update.mutateAsync({ id: editing.id, body: { kind: 'PRINT', label, priceCents, sortOrder: editing.sortOrder } });
                setEditing(null);
            } catch (saveError) {
                setError(toErrorMessage(saveError));
            }
        },
        [create, editing, toErrorMessage, update],
    );

    const confirmRemove = useCallback(async () => {
        if (!editing || editing === 'new') return;
        setError(null);
        try {
            await remove.mutateAsync(editing.id);
            setConfirmDelete(false);
            setEditing(null);
        } catch (removeError) {
            setConfirmDelete(false);
            setError(toErrorMessage(removeError));
        }
    }, [editing, remove, toErrorMessage]);

    const openNew = useCallback(() => {
        setError(null);
        setEditing('new');
    }, []);
    const openEdit = useCallback((item: VendorServiceItemDto) => {
        setError(null);
        setEditing(item);
    }, []);
    const close = useCallback(() => setEditing(null), []);
    const requestDelete = useCallback(() => setConfirmDelete(true), []);
    const cancelDelete = useCallback(() => setConfirmDelete(false), []);

    return {
        visible: isPhotographer,
        approved,
        isLoading: services.isLoading,
        sizes,
        canAdd: sizes.length < PRINT_SIZES_MAX,
        editing,
        openNew,
        openEdit,
        close,
        save,
        isSaving: create.isPending || update.isPending,
        confirmDelete,
        requestDelete,
        cancelDelete,
        confirmRemove,
        isDeleting: remove.isPending,
        error,
    };
}
