'use client';

import { useCallback, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import { type PhotoSlot, photoSlotKey, setSlotPhoto } from '@/lib/invitation/photoSlots';
import { PHOTO_COMPRESSION, photoFileProblem, type PhotoProblem, photoUploadPercent, photoUploadProblem } from '@/lib/invitation/photoUpload';
import { createPhotoUploadStore } from '@/lib/invitation/photoUploadStore';
import type { InvitationDraftImageDto } from '@/lib/invitation/programIconUpload';
import { routes } from '@/lib/routes';

type PhotoUploadsOptions = {
    draftId: string;
    store: InvitationEditorStore;
    // Shows a photo at once from the address the upload answered with.
    addUploaded: (mediaId: string, url: string) => void;
    // Makes a draft started signed out the account's; false when that failed.
    claim: () => Promise<boolean>;
};

// Smaller before sending; the original goes when the browser can't make it smaller.
async function compressPhoto(file: File, onProgress: (percent: number) => void): Promise<File> {
    try {
        const { default: imageCompression } = await import('browser-image-compression');
        return await imageCompression(file, { ...PHOTO_COMPRESSION, onProgress });
    } catch {
        return file;
    }
}

// The host's photo uploads in the editor: a file is checked, made smaller, sent to
// the draft and put in its slot as one undoable edit. A visitor signs in first,
// since the server takes photos only from an account.
export function usePhotoUploads({ draftId, store, addUploaded, claim }: PhotoUploadsOptions) {
    const { isAuthenticated } = useAuth();
    const [uploads] = useState(createPhotoUploadStore);
    const [problem, setProblem] = useState<PhotoProblem | null>(null);
    const [isSignInOpen, setIsSignInOpen] = useState(false);

    const upload = useCallback(
        async (slot: PhotoSlot, file: File) => {
            const key = photoSlotKey(slot);
            if (uploads.getState().uploads[key]) return;
            const found = photoFileProblem(file);
            setProblem(found);
            if (found) return;

            const progress = uploads.getState().set;
            progress(key, { percent: 0 });
            try {
                if (!(await claim())) throw new Error('claim');
                const small = await compressPhoto(file, (percent) => progress(key, { percent: photoUploadPercent('compressing', percent) }));
                progress(key, { percent: photoUploadPercent('sending', 100) });
                const body = new FormData();
                body.append('file', small, file.name);
                const saved = await api.postForm<InvitationDraftImageDto>(endpoints.invitationDrafts.images(draftId), body);
                addUploaded(saved.mediaId, saved.url);
                store.getState().edit(setSlotPhoto(slot, { source: 'media', mediaId: saved.mediaId }, saved));
            } catch (error) {
                setProblem(photoUploadProblem(error));
            } finally {
                uploads.getState().clear(key);
            }
        },
        [addUploaded, claim, draftId, store, uploads],
    );

    // Opens the file picker, or the sign-in pop-up for a visitor.
    const canPick = useCallback(() => {
        if (isAuthenticated) return true;
        setIsSignInOpen(true);
        return false;
    }, [isAuthenticated]);

    const dismissProblem = useCallback(() => setProblem(null), []);
    const closeSignIn = useCallback(() => setIsSignInOpen(false), []);

    const slots = useMemo(() => ({ uploads, upload, canPick }), [canPick, upload, uploads]);

    return {
        slots,
        problem,
        dismissProblem,
        signIn: {
            open: isSignInOpen,
            close: closeSignIn,
            // Back in the same draft after signing in; the draft is claimed there.
            loginHref: routes.auth.login({ next: routes.saveMyDateEditor(draftId) }),
            registerHref: routes.auth.register({ next: routes.saveMyDateEditor(draftId) }),
        },
    };
}

export type PhotoUploadSlots = ReturnType<typeof usePhotoUploads>['slots'];
export type EditorSignInState = ReturnType<typeof usePhotoUploads>['signIn'];
