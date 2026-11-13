'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type ChangeEvent, type CSSProperties, useCallback, useRef } from 'react';

type GalleryPhotoTileOptions = {
    id: string;
    index: number;
    canPick?: () => boolean;
    onReplace: (index: number, file: File) => void;
    onDelete: (index: number) => void;
};

// One photo of the gallery list: dragged by its handle, replaced from the file picker, deleted.
export function useGalleryPhotoTile({ id, index, canPick, onReplace, onDelete }: GalleryPhotoTileOptions) {
    const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id, data: { n: index + 1 } });
    const inputRef = useRef<HTMLInputElement>(null);

    const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition };

    const pick = useCallback(() => {
        if (canPick?.()) inputRef.current?.click();
    }, [canPick]);

    const onFile = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onReplace(index, file);
        },
        [index, onReplace],
    );

    const remove = useCallback(() => onDelete(index), [index, onDelete]);

    return {
        setNodeRef,
        handleRef: setActivatorNodeRef,
        handleProps: { ...attributes, ...listeners },
        style,
        isDragging,
        inputRef,
        pick,
        onFile,
        remove,
    };
}
