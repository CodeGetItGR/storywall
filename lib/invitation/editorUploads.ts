import type { AdminInvitationThemeAssetDto } from '@/lib/adminInvitationThemes';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { InvitationDraftImageDto } from '@/lib/invitation/programIconUpload';

// Where the editor's uploads go: a host's draft, or the admin's theme. Either way the
// document names the image by the id the upload answers with.
export type UploadedImage = { mediaId: string; url: string };
export type ImageUploader = (file: Blob) => Promise<UploadedImage>;

function formWith(file: Blob): FormData {
    const body = new FormData();
    body.append('file', file);
    return body;
}

export function draftImageUploader(draftId: string): ImageUploader {
    return async (file) => {
        const saved = await api.postForm<InvitationDraftImageDto>(endpoints.invitationDrafts.images(draftId), formWith(file));
        return { mediaId: saved.mediaId, url: saved.url };
    };
}

// A theme's own image: its asset id is what the design and document point at.
export function themeImageUploader(themeId: string): ImageUploader {
    return async (file) => {
        const saved = await api.postForm<AdminInvitationThemeAssetDto>(endpoints.admin.invitationThemes.assets(themeId), formWith(file));
        return { mediaId: saved.assetId, url: saved.url };
    };
}
