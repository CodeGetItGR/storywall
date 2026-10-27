'use client';

import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCreateVendorService, useDeleteVendorService, useUpdateVendorService, useVendorServices } from '@/hooks/useVendorServices';
import type { VendorMeDto, VendorServiceItemDto } from '@/lib/api/types';
import { PRINT_SIZES_MAX } from '@/lib/printPicks';
import type { ProfileStatus } from '@/lib/vendors';

// The Services section: print sizes for approved-partner photographers, one line for other photographers.
export function useVendorServicesSection(me: VendorMeDto | null, profileStatus: ProfileStatus) {
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
    const [sheetError, setSheetError] = useState<string | null>(null);

    // Only a read with nothing to show counts as failed: a refetch that fails keeps the data it had.
    const loadFailed = Boolean(services.error) && !services.data;
    const sizes = (services.data ?? []).filter((item) => item.kind === 'PRINT');

    const save = useCallback(
        async (label: string, priceCents: number) => {
            setSheetError(null);
            try {
                if (editing === 'new') await create.mutateAsync({ kind: 'PRINT', label, priceCents });
                else if (editing)
                    await update.mutateAsync({ id: editing.id, body: { kind: 'PRINT', label, priceCents, sortOrder: editing.sortOrder } });
                setEditing(null);
            } catch (error) {
                setSheetError(toErrorMessage(error));
            }
        },
        [create, editing, toErrorMessage, update],
    );

    const confirmRemove = useCallback(async () => {
        if (!editing || editing === 'new') return;
        setSheetError(null);
        try {
            await remove.mutateAsync(editing.id);
            setConfirmDelete(false);
            setEditing(null);
        } catch (error) {
            setConfirmDelete(false);
            setSheetError(toErrorMessage(error));
        }
    }, [editing, remove, toErrorMessage]);

    const openNew = useCallback(() => {
        setSheetError(null);
        setEditing('new');
    }, []);
    const openEdit = useCallback((item: VendorServiceItemDto) => {
        setSheetError(null);
        setEditing(item);
    }, []);
    const close = useCallback(() => {
        setSheetError(null);
        setEditing(null);
    }, []);
    const requestDelete = useCallback(() => setConfirmDelete(true), []);
    const cancelDelete = useCallback(() => setConfirmDelete(false), []);

    return {
        visible: isPhotographer,
        approved,
        isLoading: services.isLoading,
        // A failed read must not look like "No sizes yet."
        loadFailed,
        sizes,
        canAdd: sizes.length < PRINT_SIZES_MAX,
        // A size belongs to the saved details: without them the backend refuses it.
        needsProfile: profileStatus === 'missing',
        profileLoading: profileStatus === 'loading',
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
        // The section shows the load error (not while a sheet is open); the sheet shows its own save and delete errors.
        sectionError: editing || !loadFailed ? null : toErrorMessage(services.error),
        sheetError,
    };
}
