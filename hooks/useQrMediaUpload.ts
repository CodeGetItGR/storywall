import { useMutation } from '@tanstack/react-query';

import { useAppConfig } from '@/hooks/useAppConfig';
import { uploadInBatches } from '@/lib/api/batchUpload';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { MediaBatchUploadResponseDto, MediaResponseDto } from '@/lib/api/types';
import { sendUploadWithBusyRetry } from '@/lib/api/uploadRetry';
import { getUploadLimits } from '@/lib/uploadLimits';

// What the scanner ticked: 16 or over, and these Terms and Community Guidelines
// versions (the ones in force). Required on every QR upload since 2026-10-05.
export interface QrUploadAcceptance {
    termsVersion: string;
    guidelinesVersion: string;
}

function appendAcceptance(formData: FormData, acceptance: QrUploadAcceptance) {
    formData.append('ageConfirmed', 'true');
    formData.append('acceptedTermsVersion', acceptance.termsVersion);
    formData.append('acceptedGuidelinesVersion', acceptance.guidelinesVersion);
}

interface UploadQrMediaInput {
    token: string;
    file: File;
    uploaderName?: string;
    acceptance: QrUploadAcceptance;
    onBusy?: (busy: boolean) => void;
}

// POST /api/qr/{token}/media — fully public, no account, no join. The
// scanned QR token is the credential. See
// docs/integration guides/invite-redemption-and-anonymous-upload-fe-changelog.md §2.
export function useUploadQrMedia() {
    return useMutation({
        mutationFn: ({ token, file, uploaderName, acceptance, onBusy }: UploadQrMediaInput) => {
            const formData = new FormData();
            formData.append('file', file);
            if (uploaderName) formData.append('uploaderName', uploaderName);
            appendAcceptance(formData, acceptance);
            return sendUploadWithBusyRetry(() => api.publicPostForm<MediaResponseDto>(endpoints.qrLinks.media(token), formData), { onBusy });
        },
    });
}

interface UploadQrMediaBatchInput {
    token: string;
    files: File[];
    uploaderName?: string;
    acceptance: QrUploadAcceptance;
    onBusy?: (busy: boolean) => void;
}

// POST /api/qr/{token}/media/batch — same anonymous contract, multiple files.
// Always resolves 200; per-file outcomes are in created[]/failed[]. Split into
// as many requests as the size and count limits need (see uploadInBatches).
export function useUploadQrMediaBatch() {
    const { data: appConfig } = useAppConfig();
    const limits = getUploadLimits(appConfig?.media);

    return useMutation({
        mutationFn: ({ token, files, uploaderName, acceptance, onBusy }: UploadQrMediaBatchInput) =>
            uploadInBatches(
                files,
                limits,
                (batch) => {
                    const formData = new FormData();
                    batch.forEach((file) => formData.append('files', file));
                    if (uploaderName) formData.append('uploaderName', uploaderName);
                    appendAcceptance(formData, acceptance);
                    return api.publicPostForm<MediaBatchUploadResponseDto>(endpoints.qrLinks.mediaBatch(token), formData);
                },
                { onBusy },
            ),
    });
}
