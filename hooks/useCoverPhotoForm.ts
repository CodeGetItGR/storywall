'use client';

import type React from 'react';
import { type RefObject, useEffect, useRef, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useUploadMedia } from '@/hooks/useMedia';
import { useSettingsPartSave } from '@/hooks/useSettingsPartSave';
import type { EventDetailResponseDto } from '@/lib/api/types';

type CoverPhotoFormArgs = {
    event: EventDetailResponseDto;
    canUpload: boolean;
    // The hidden file input, owned by the form so no ref is returned from here.
    fileRef: RefObject<HTMLInputElement | null>;
    onSaved: () => void;
};

// The cover photo editor: today's upload, preview and undo of a picked photo. Saving sets it as the cover.
export function useCoverPhotoForm({ event, canUpload, fileRef, onSaved }: CoverPhotoFormArgs) {
    const toErrorMessage = useApiErrorMessage();
    const uploadMedia = useUploadMedia();
    const { save, isSaving, errorMessage } = useSettingsPartSave(event.id, onSaved);
    const [coverPreview, setCoverPreview] = useState<string | null>(event.coverMedia?.mediaUrl ?? null);
    const [pendingCoverMediaId, setPendingCoverMediaId] = useState<string | null>(null);
    const [isCoverBusy, setIsCoverBusy] = useState(false);
    const objectUrlRef = useRef<string | null>(null);

    useEffect(() => {
        return () => {
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        };
    }, []);

    function releaseObjectUrl() {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    }

    function handleRemovePendingCover() {
        if (!canUpload) return;
        releaseObjectUrl();
        setPendingCoverMediaId(null);
        setCoverPreview(event.coverMedia?.mediaUrl ?? null);
    }

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        if (!canUpload) return;
        const file = e.target.files?.[0];
        if (!file) return;
        releaseObjectUrl();
        const nextPreviewUrl = URL.createObjectURL(file);
        objectUrlRef.current = nextPreviewUrl;
        setCoverPreview(nextPreviewUrl);
        uploadMedia.mutate(
            { eventId: event.id, file, context: 'COVER', onBusy: setIsCoverBusy },
            {
                onSuccess: (media) => setPendingCoverMediaId(media.id),
                // A refused photo (too large, not an image) must not stay on screen
                // looking like the cover that saving would set.
                onError: handleRemovePendingCover,
            },
        );
    }

    function handleChangeCoverClick() {
        if (!canUpload) return;
        fileRef.current?.click();
    }

    function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!pendingCoverMediaId) return;
        void save({ coverMediaId: pendingCoverMediaId });
    }

    return {
        coverPreview,
        hasPendingCover: Boolean(pendingCoverMediaId),
        isUploading: uploadMedia.isPending,
        isCoverBusy,
        uploadError: uploadMedia.isError ? toErrorMessage(uploadMedia.error) : null,
        handleFile,
        handleRemovePendingCover,
        handleChangeCoverClick,
        handleSubmit,
        isSaving,
        errorMessage,
        canSave: Boolean(pendingCoverMediaId) && !uploadMedia.isPending,
    };
}
