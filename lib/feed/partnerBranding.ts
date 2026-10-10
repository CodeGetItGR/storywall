import { api } from '@/lib/api/client';
import type { PartnerBrandingPlacementDto, PartnerBrandingTextDto, PostResponseDto } from '@/lib/api/types';

export type FeedItem = { kind: 'post'; post: PostResponseDto; index: number } | { kind: 'partner'; key: string };

/**
 * Whether a partner card follows the post at this 1-based feed position: after
 * post `firstAfter`, then every `every` posts, with no cap. A feed with no more
 * than `firstAfter` posts gets none.
 */
export function isPartnerCardSlot(position: number, postCount: number, { firstAfter, every }: PartnerBrandingPlacementDto): boolean {
    if (firstAfter < 1 || postCount <= firstAfter || position < firstAfter || position > postCount) return false;
    if (position === firstAfter) return true;
    return every >= 1 && (position - firstAfter) % every === 0;
}

/** The feed's posts with partner cards placed between them. Cards are only rendered; nothing is stored. */
export function withPartnerCards(posts: PostResponseDto[], placement: PartnerBrandingPlacementDto | null): FeedItem[] {
    const items: FeedItem[] = [];
    posts.forEach((post, index) => {
        items.push({ kind: 'post', post, index });
        const position = index + 1;
        if (placement && isPartnerCardSlot(position, posts.length, placement)) items.push({ kind: 'partner', key: `partner-${position}` });
    });
    return items;
}

/** The partner's text in the UI language, falling back to Greek. */
export function partnerBrandingText(text: PartnerBrandingTextDto, locale: string): string {
    const localized = locale === 'en' ? text.en : text.el;
    return localized?.trim() ? localized : text.el;
}

/** The click redirect on the API origin; it counts the tap and forwards to the partner's site. */
export function partnerBrandingHref(linkUrl: string): string {
    return api.url(linkUrl);
}
