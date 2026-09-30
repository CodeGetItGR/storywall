'use client';

import { type ChangeEvent, type DragEvent, useCallback, useMemo, useRef, useState } from 'react';

import { useFilePreviews } from '@/hooks/useFilePreviews';

/**
 * One image picked by click or drop. The file stays in the file input itself,
 * so the surrounding form still reads it from FormData.
 */
export function useImageDropInput() {
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const files = useMemo(() => (file ? [file] : []), [file]);
    const previewUrl = useFilePreviews(files)[0]?.url ?? null;

    const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setFile(event.target.files?.[0] ?? null);
    }, []);

    const handleDragOver = useCallback((event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        setIsDragActive(true);
    }, []);

    const handleDragLeave = useCallback(() => setIsDragActive(false), []);

    const handleDrop = useCallback((event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        setIsDragActive(false);
        const dropped = Array.from(event.dataTransfer.files).find((candidate) => candidate.type.startsWith('image/'));
        if (!dropped || !inputRef.current) return;
        const transfer = new DataTransfer();
        transfer.items.add(dropped);
        inputRef.current.files = transfer.files;
        setFile(dropped);
    }, []);

    const clear = useCallback(() => {
        if (inputRef.current) inputRef.current.value = '';
        setFile(null);
    }, []);

    return { inputRef, file, previewUrl, isDragActive, handleChange, handleDragOver, handleDragLeave, handleDrop, clear };
}
