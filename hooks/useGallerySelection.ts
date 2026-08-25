import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface GallerySelectableItem {
    id: string;
}

export function useGallerySelection<TItem extends GallerySelectableItem>(items: TItem[], longPressMs = 450) {
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
    const longPressTimerRef = useRef<number | null>(null);
    const longPressTriggeredRef = useRef(false);

    const selectedItems = useMemo(() => items.filter((item) => selectedIds.has(item.id)), [items, selectedIds]);

    const clearLongPressTimer = useCallback(() => {
        if (longPressTimerRef.current === null) return;
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
    }, []);

    useEffect(() => clearLongPressTimer, [clearLongPressTimer]);

    const enterSelectionMode = useCallback((id?: string) => {
        setSelectionMode(true);
        if (!id) return;
        setSelectedIds((current) => {
            if (current.has(id)) return current;
            const next = new Set(current);
            next.add(id);
            return next;
        });
    }, []);

    const exitSelectionMode = useCallback(() => {
        clearLongPressTimer();
        longPressTriggeredRef.current = false;
        setSelectionMode(false);
        setSelectedIds(new Set());
    }, [clearLongPressTimer]);

    const toggleSelection = useCallback((id: string) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const selectAll = useCallback(() => {
        setSelectionMode(true);
        setSelectedIds(new Set(items.map((item) => item.id)));
    }, [items]);

    const startLongPressSelection = useCallback(
        (event: PointerEvent, id: string) => {
            if (event.pointerType === 'mouse') return;
            clearLongPressTimer();
            longPressTriggeredRef.current = false;
            longPressTimerRef.current = window.setTimeout(() => {
                longPressTriggeredRef.current = true;
                enterSelectionMode(id);
                longPressTimerRef.current = null;
            }, longPressMs);
        },
        [clearLongPressTimer, enterSelectionMode, longPressMs]
    );

    const stopLongPressSelection = useCallback(() => {
        clearLongPressTimer();
    }, [clearLongPressTimer]);

    const consumeLongPressClick = useCallback(() => {
        if (!longPressTriggeredRef.current) return false;
        longPressTriggeredRef.current = false;
        return true;
    }, []);

    return {
        selectionMode,
        selectedIds,
        selectedItems,
        selectedCount: selectedItems.length,
        enterSelectionMode,
        exitSelectionMode,
        toggleSelection,
        selectAll,
        startLongPressSelection,
        stopLongPressSelection,
        consumeLongPressClick,
    };
}
