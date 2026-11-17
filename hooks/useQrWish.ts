import { useMutation } from '@tanstack/react-query';

import type { QrUploadAcceptance } from '@/hooks/useQrMediaUpload';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { QrWishRequestDto, QrWishResponseDto } from '@/lib/api/types';
import { buildWishFormData } from '@/lib/wishbook/voice';

interface SendQrWishInput {
    token: string;
    guestName: string;
    message: string;
    audio?: Blob | null;
    acceptance: QrUploadAcceptance;
}

// POST /api/qr/{token}/wishes: no account, no auth header. The scanned token is the credential.
// With a recording it goes as multipart, the acceptance inside the `wish` part (KAN-219).
export function useSendQrWish() {
    return useMutation({
        mutationFn: ({ token, guestName, message, audio, acceptance }: SendQrWishInput) => {
            const wish = {
                guestName,
                ...(message ? { message } : {}),
                ageConfirmed: true,
                acceptedTermsVersion: acceptance.termsVersion,
                acceptedGuidelinesVersion: acceptance.guidelinesVersion,
            } satisfies QrWishRequestDto;
            return audio
                ? api.publicPostForm<QrWishResponseDto>(endpoints.qrLinks.wishes(token), buildWishFormData(wish, audio))
                : api.publicPost<QrWishResponseDto>(endpoints.qrLinks.wishes(token), wish);
        },
    });
}
