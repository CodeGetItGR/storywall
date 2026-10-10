'use client';

import { type ChangeEvent, useCallback, useState } from 'react';

import {
    type PartnerBrandingImageKind,
    useRemoveCollaboratorBrandingImage,
    useSaveCollaboratorBranding,
    useSetCollaboratorBrandingEnabled,
    useUploadCollaboratorBrandingImage,
} from '@/hooks/useAdminPartnerBranding';
import { brandingRequestFromFormData } from '@/lib/adminPartnerBranding';
import type { CollaboratorResponseDto } from '@/lib/api/types';

export const BRANDING_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

/** The feed card text drawer. A save replaces every text field at once. */
export function useCollaboratorBrandingDrawer(collaborator: CollaboratorResponseDto, onCloseAction: () => void) {
    const save = useSaveCollaboratorBranding();

    const handleSubmit = useCallback(
        async (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            try {
                await save.mutateAsync({ id: collaborator.id, input: brandingRequestFromFormData(new FormData(event.currentTarget)) });
                onCloseAction();
            } catch {
                // Shown through saveError.
            }
        },
        [collaborator.id, onCloseAction, save],
    );

    // Clears a failed save so it doesn't reappear the next time the drawer opens.
    const handleClose = useCallback(() => {
        save.reset();
        onCloseAction();
    }, [onCloseAction, save]);

    return { handleSubmit, handleClose, isSaving: save.isPending, saveError: save.error };
}

/** One feed card image. Each change is saved at once; removing asks first. */
export function useCollaboratorBrandingImage(collaborator: CollaboratorResponseDto, kind: PartnerBrandingImageKind) {
    const upload = useUploadCollaboratorBrandingImage();
    const remove = useRemoveCollaboratorBrandingImage();
    const [confirmingRemove, setConfirmingRemove] = useState(false);

    const handleFileChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.currentTarget.files?.[0];
            // Lets the same file be picked again after a refusal.
            event.currentTarget.value = '';
            if (!file) return;
            remove.reset();
            upload.mutate({ id: collaborator.id, kind, file });
        },
        [collaborator.id, kind, remove, upload],
    );

    const openRemove = useCallback(() => {
        upload.reset();
        remove.reset();
        setConfirmingRemove(true);
    }, [remove, upload]);

    const closeRemove = useCallback(() => setConfirmingRemove(false), []);

    const confirmRemove = useCallback(async () => {
        try {
            await remove.mutateAsync({ id: collaborator.id, kind });
            setConfirmingRemove(false);
        } catch {
            // Shown through error.
        }
    }, [collaborator.id, kind, remove]);

    return {
        imageUrl: kind === 'logo' ? collaborator.brandingLogoUrl : collaborator.brandingCoverUrl,
        // The backend refuses to remove an image from a card that is on.
        canRemove: !collaborator.brandingEnabled,
        isUploading: upload.isPending,
        isRemoving: remove.isPending,
        error: upload.error ?? remove.error,
        confirmingRemove,
        handleFileChange,
        openRemove,
        closeRemove,
        confirmRemove,
    };
}

export type CollaboratorBrandingImage = ReturnType<typeof useCollaboratorBrandingImage>;

/** Turning the card on or off, each confirmed first. */
export function useCollaboratorBrandingToggle(collaborator: CollaboratorResponseDto) {
    const setEnabled = useSetCollaboratorBrandingEnabled();
    const [confirming, setConfirming] = useState(false);

    const open = useCallback(() => {
        setEnabled.reset();
        setConfirming(true);
    }, [setEnabled]);

    const close = useCallback(() => setConfirming(false), []);

    const confirm = useCallback(async () => {
        try {
            await setEnabled.mutateAsync({ id: collaborator.id, enabled: !collaborator.brandingEnabled });
            setConfirming(false);
        } catch {
            // Shown through error.
        }
    }, [collaborator.brandingEnabled, collaborator.id, setEnabled]);

    return { confirming, open, close, confirm, isSaving: setEnabled.isPending, error: setEnabled.error };
}
