import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface GallerySelectableItem {
    id: string;
}

export function useGallerySelection<TItem extends GallerySelectableItem>(items: TItem[], longPressMs = 450, maxSelectedItems = Infinity) {
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIdSet, setSelectedIdSet] = useState<Set<string>>(() => new Set());
    const longPressTimerRef = useRef<number | null>(null);
    const longPressTriggeredRef = useRef(false);

    const selectedItems = useMemo(() => items.filter((item) => selectedIdSet.has(item.id)), [items, selectedIdSet]);
    const selectedIds = useMemo(() => new Set(selectedItems.map((item) => item.id)), [selectedItems]);

    const clearLongPressTimer = useCallback(() => {
        if (longPressTimerRef.current === null) return;
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
    }, []);

    useEffect(() => clearLongPressTimer, [clearLongPressTimer]);

    const enterSelectionMode = useCallback(
        (id?: string) => {
            setSelectionMode(true);
            if (!id) return;
            setSelectedIdSet((current) => {
                if (current.has(id)) return current;
                if (current.size >= maxSelectedItems) return current;
                const next = new Set(current);
                next.add(id);
                return next;
            });
        },
        [maxSelectedItems]
    );

    const exitSelectionMode = useCallback(() => {
        clearLongPressTimer();
        longPressTriggeredRef.current = false;
        setSelectionMode(false);
        setSelectedIdSet(new Set());
    }, [clearLongPressTimer]);

    const toggleSelection = useCallback(
        (id: string) => {
            setSelectedIdSet((current) => {
                const next = new Set(current);
                if (next.has(id)) {
                    next.delete(id);
                } else if (next.size < maxSelectedItems) {
                    next.add(id);
                } else {
                    return current;
                }
                return next;
            });
        },
        [maxSelectedItems]
    );

    const selectAll = useCallback(() => {
        setSelectionMode(true);
        setSelectedIdSet(new Set(items.slice(0, maxSelectedItems).map((item) => item.id)));
    }, [items, maxSelectedItems]);

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
