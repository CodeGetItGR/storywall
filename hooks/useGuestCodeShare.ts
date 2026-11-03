'use client';

import { useCopyText } from '@/hooks/useCopyText';
import { useNativeShare } from '@/hooks/useNativeShare';
import { useShareLink } from '@/hooks/useShareLink';
import type { QrLinkResponseDto } from '@/lib/api/types';

// Shares a lite event's guest code link from the host's device: the share sheet where the browser has one,
// otherwise the link is copied. Same as useInviteShare, for the guest code.
export function useGuestCodeShare(guestLink: QrLinkResponseDto | null, title?: string) {
    const shareLink = useShareLink(guestLink?.publicUrl ?? '');
    const { canShare, share: nativeShare } = useNativeShare(shareLink, title);
    const { copied, copy } = useCopyText(shareLink);

    return { copied, share: canShare ? nativeShare : copy };
}
