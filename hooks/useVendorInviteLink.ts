'use client';

import { useCopyText } from '@/hooks/useCopyText';
import { useNativeShare } from '@/hooks/useNativeShare';
import { useShareLink } from '@/hooks/useShareLink';
import type { VendorLinkDto } from '@/lib/api/types';
import { vendorInviteUrl } from '@/lib/vendors';

// One vendor link's copy and share actions. The QR code keeps the bare link: the printed code stays language-neutral.
export function useVendorInviteLink(link: VendorLinkDto, title: string) {
    const qrUrl = vendorInviteUrl(link.inviteToken);
    // Copied and shared links carry the host's language, like the event's share links.
    const shareUrl = useShareLink(qrUrl);
    const { copied, copy } = useCopyText(shareUrl);
    const { canShare, share } = useNativeShare(shareUrl, title);

    return { qrUrl, copied, copy, canShare, share };
}
