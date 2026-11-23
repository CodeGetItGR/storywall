'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { useAdminTextStylePresets, useSaveTextStylePreset, useTextStylePresetMove } from '@/hooks/useAdminTextStylePresets';
import type { TextStylePresetDto, TextStylePresetRequestDto } from '@/lib/api/types';
import { bySortOrder } from '@/lib/sortOrder';

// token: which opening this is. The drawer is keyed on it, so each opening starts from the preset's saved values,
// and a save that finishes after the admin moved on can't close the drawer they have open now.
type DrawerState = { open: false } | { open: true; preset: TextStylePresetDto | null; token: number };

const NO_PRESETS: TextStylePresetDto[] = [];

// The admin Style presets section: the list in its order, the drag/arrow move, and the drawer to create, edit or
// delete one preset.
export function useTextStylesPanel() {
    const query = useAdminTextStylePresets();
    const presets = useMemo(() => [...(query.data ?? NO_PRESETS)].sort(bySortOrder), [query.data]);
    const move = useTextStylePresetMove(presets);
    const rows = move.arrange(presets);
    const { save, remove } = useSaveTextStylePreset();
    const [drawer, setDrawer] = useState<DrawerState>({ open: false });
    const nextToken = useRef(0);
    const { reset: resetSave, mutate: mutateSave } = save;
    const { reset: resetRemove, mutate: mutateRemove } = remove;

    const openDrawer = useCallback(
        (preset: TextStylePresetDto | null) => {
            nextToken.current += 1;
            resetSave();
            resetRemove();
            setDrawer({ open: true, preset, token: nextToken.current });
        },
        [resetRemove, resetSave],
    );

    const openCreate = useCallback(() => openDrawer(null), [openDrawer]);

    const openToken = drawer.open ? drawer.token : 0;
    const closeDrawer = useCallback(() => {
        setDrawer((current) => (current.open && current.token === openToken ? { open: false } : current));
    }, [openToken]);

    const editingId = drawer.open ? (drawer.preset?.id ?? null) : null;
    const saveDrawer = useCallback(
        (body: TextStylePresetRequestDto) => mutateSave({ id: editingId, body }, { onSuccess: closeDrawer }),
        [closeDrawer, editingId, mutateSave],
    );
    const deleteDrawer = useCallback(() => {
        if (editingId) mutateRemove(editingId, { onSuccess: closeDrawer });
    }, [closeDrawer, editingId, mutateRemove]);

    return {
        query,
        presets,
        rows,
        move,
        drawer,
        openCreate,
        openEdit: openDrawer,
        closeDrawer,
        saveDrawer,
        deleteDrawer,
        isSaving: save.isPending,
        isDeleting: remove.isPending,
        drawerError: save.error ?? remove.error,
    };
}
