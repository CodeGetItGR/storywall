import type { VendorContactStatus } from '@/lib/api/types';

export type VendorMessageFilter = VendorContactStatus | 'ALL';

export const VENDOR_MESSAGE_FILTERS: readonly VendorMessageFilter[] = ['NEW', 'ANSWERED', 'ALL'];

const REPLY_SUBJECT = 'StoryWall';

// Only the address and a subject: the message text never goes into the link.
export function vendorReplyHref(email: string): string {
    return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(REPLY_SUBJECT)}`;
}
