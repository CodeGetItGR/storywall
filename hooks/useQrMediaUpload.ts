import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { MediaBatchUploadResponseDto, MediaResponseDto } from '@/lib/api/types';

interface UploadQrMediaInput {
    token: string;
    file: File;
    uploaderName?: string;
}

// POST /api/qr/{token}/media — fully public, no account, no join. The
// scanned QR token is the credential. See
// docs/integration guides/invite-redemption-and-anonymous-upload-fe-changelog.md §2.
export function useUploadQrMedia() {
    return useMutation({
        mutationFn: ({ token, file, uploaderName }: UploadQrMediaInput) => {
            const formData = new FormData();
            formData.append('file', file);
            if (uploaderName) formData.append('uploaderName', uploaderName);
            return api.publicPostForm<MediaResponseDto>(endpoints.qrLinks.media(token), formData);
        },
    });
}

interface UploadQrMediaBatchInput {
    token: string;
    files: File[];
    uploaderName?: string;
}

// POST /api/qr/{token}/media/batch — same anonymous contract, multiple files.
// Always resolves 200; per-file outcomes are in created[]/failed[].
export function useUploadQrMediaBatch() {
    return useMutation({
        mutationFn: ({ token, files, uploaderName }: UploadQrMediaBatchInput) => {
            const formData = new FormData();
            files.forEach((file) => formData.append('files', file));
            if (uploaderName) formData.append('uploaderName', uploaderName);
            return api.publicPostForm<MediaBatchUploadResponseDto>(endpoints.qrLinks.mediaBatch(token), formData);
        },
    });
}
