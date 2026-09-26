'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { meQueryKey } from '@/hooks/useMe';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { UserResponseDto } from '@/lib/api/types';

// Formats the backend accepts for a profile picture.
export const PROFILE_PICTURE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

// Picking a file only opens a preview; nothing is uploaded until confirm().
export function useProfilePictureUpload() {
    const queryClient = useQueryClient();
    const { updateProfile } = useAuth();
    const toErrorMessage = useApiErrorMessage();

    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isUpdated, setIsUpdated] = useState(false);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const upload = useMutation({
        mutationFn: (selected: File) => {
            const formData = new FormData();
            formData.append('file', selected);
            return api.postForm<UserResponseDto>(endpoints.me.profilePicture, formData);
        },
        onSuccess: async (updated) => {
            // The profile screen reads the picture from the /api/me cache, so it
            // has to hold the fresh URL — otherwise the old picture comes back
            // until the next refetch. Cancel first so an older in-flight
            // refetch can't land on top of it.
            await queryClient.cancelQueries({ queryKey: meQueryKey });
            queryClient.setQueryData(meQueryKey, updated);
            updateProfile(updated);
            setFile(null);
            setPreviewUrl(null);
            setIsUpdated(true);
        },
        onError: (uploadError) => {
            setError(toErrorMessage(uploadError));
        },
    });

    function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const next = event.target.files?.[0] ?? null;
        // Reset so picking the same file again still fires a change event.
        event.target.value = '';
        if (!next || upload.isPending) return;

        setError(null);
        setIsUpdated(false);
        setFile(next);
        setPreviewUrl(URL.createObjectURL(next));
    }

    function confirm() {
        if (!file || upload.isPending) return;
        setError(null);
        upload.mutate(file);
    }

    function cancel() {
        if (upload.isPending) return;
        setFile(null);
        setPreviewUrl(null);
        setError(null);
    }

    return {
        cancel,
        confirm,
        error,
        handleFileChange,
        isOpen: file !== null,
        isUpdated,
        isUploading: upload.isPending,
        previewUrl,
    };
}
