export type FeedQuickActionKey = 'invitation' | 'photos' | 'wishbook' | 'share' | 'vendors';

export interface FeedQuickActionSources {
    invitationSlug: string | null;
    uploadToken: string | null;
    hasWishbook: boolean;
    canShare: boolean;
    hasVendors: boolean;
}

// Which of the feed's quick actions the event has, in display order.
export function feedQuickActionKeys(sources: FeedQuickActionSources): FeedQuickActionKey[] {
    const keys: FeedQuickActionKey[] = [];
    if (sources.invitationSlug) keys.push('invitation');
    if (sources.uploadToken) keys.push('photos');
    if (sources.hasWishbook) keys.push('wishbook');
    if (sources.canShare) keys.push('share');
    if (sources.hasVendors) keys.push('vendors');
    return keys;
}

// A sideways row's fade: each edge that has more tiles past it fades out, so the row reads as scrollable.
// Undefined when nothing is hidden on either side.
export function edgeFadeMask({ before, after }: { before: boolean; after: boolean }): string | undefined {
    if (!before && !after) return undefined;
    const start = before ? 'transparent, black 2.5rem' : 'black';
    const end = after ? 'black calc(100% - 3.5rem), transparent' : 'black';
    return `linear-gradient(to right, ${start}, ${end})`;
}
