'use client';

import { useCallback, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { type PhotoIssue, type PhotoUploadOptions, usePhotoSlotUploads } from '@/hooks/usePhotoSlotUploads';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { PhotoSlot } from '@/lib/invitation/photoSlots';
import type { PhotoProblem } from '@/lib/invitation/photoUpload';
import type { PhotoUploadStore } from '@/lib/invitation/photoUploadStore';
import type { InvitationDraftImageDto } from '@/lib/invitation/programIconUpload';
import { routes } from '@/lib/routes';

// What a photo slot needs of the editor around it.
export type PhotoUploadSlots = {
    uploads: PhotoUploadStore;
    upload: (slot: PhotoSlot, file: File, options?: PhotoUploadOptions) => Promise<void>;
    // True when a file may be picked now.
    canPick: () => boolean;
    report: (problem: PhotoProblem | null, sectionId?: string) => void;
    // Shown at the photo's own place, on the feed. The Save my date editor shows it under its top bar instead.
    issue?: PhotoIssue | null;
};

type PhotoUploadsOptions = {
    draftId: string;
    store: InvitationEditorStore;
    // Shows a photo at once from the address the upload answered with.
    addUploaded: (mediaId: string, url: string) => void;
    // Makes a draft started signed out the account's; false when that failed.
    claim: () => Promise<boolean>;
};

// The host's photo uploads in the Save my date editor, sent to the draft. A visitor signs in first,
// since the server takes photos only from an account.
export function usePhotoUploads({ draftId, store, addUploaded, claim }: PhotoUploadsOptions) {
    const { isAuthenticated } = useAuth();
    const [isSignInOpen, setIsSignInOpen] = useState(false);

    const prepare = useCallback(async () => {
        if (!(await claim())) throw new Error('claim');
    }, [claim]);
    const send = useCallback((body: FormData) => api.postForm<InvitationDraftImageDto>(endpoints.invitationDrafts.images(draftId), body), [draftId]);
    const { uploads, upload, report, issue } = usePhotoSlotUploads({ store, prepare, send, addUploaded });

    // Opens the file picker, or the sign-in pop-up for a visitor.
    const canPick = useCallback(() => {
        if (isAuthenticated) return true;
        setIsSignInOpen(true);
        return false;
    }, [isAuthenticated]);

    const dismissProblem = useCallback(() => report(null), [report]);
    const closeSignIn = useCallback(() => setIsSignInOpen(false), []);

    const slots = useMemo<PhotoUploadSlots>(() => ({ uploads, upload, canPick, report }), [canPick, report, upload, uploads]);

    return {
        slots,
        problem: issue?.problem ?? null,
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

export type EditorSignInState = ReturnType<typeof usePhotoUploads>['signIn'];
