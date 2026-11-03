import { useMutation } from '@tanstack/react-query';

import type { QrUploadAcceptance } from '@/hooks/useQrMediaUpload';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { QrWishRequestDto, QrWishResponseDto } from '@/lib/api/types';

interface SendQrWishInput {
    token: string;
    guestName: string;
    message: string;
    acceptance: QrUploadAcceptance;
}

// POST /api/qr/{token}/wishes: no account, no auth header. The scanned token is the credential.
export function useSendQrWish() {
    return useMutation({
        mutationFn: ({ token, guestName, message, acceptance }: SendQrWishInput) =>
            api.publicPost<QrWishResponseDto>(endpoints.qrLinks.wishes(token), {
                guestName,
                message,
                ageConfirmed: true,
                acceptedTermsVersion: acceptance.termsVersion,
                acceptedGuidelinesVersion: acceptance.guidelinesVersion,
            } satisfies QrWishRequestDto),
    });
}
