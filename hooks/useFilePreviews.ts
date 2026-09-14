'use client';

import { useEffect, useMemo } from 'react';

export interface FilePreview {
    file: File;
    url: string;
    isVideo: boolean;
}

export function useFilePreviews(files: File[]): FilePreview[] {
    const previews = useMemo(
        () =>
            files.map((file) => ({
                file,
                url: URL.createObjectURL(file),
                isVideo: file.type.startsWith('video/'),
            })),
        [files]
    );

    useEffect(() => {
        return () => {
            previews.forEach((preview) => URL.revokeObjectURL(preview.url));
        };
    }, [previews]);

    return previews;
}
