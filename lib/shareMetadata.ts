import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getServerLocale } from '@/i18n/serverLocale';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicCachedGet, serverPublicGet } from '@/lib/api/serverFetch';
import type { EventInvitationPreviewDto, MediaResponseDto, QrLinkResolutionDto, QrTargetType } from '@/lib/api/types';
import { formatEventDateParts } from '@/lib/datetime';
import { SITE_URL } from '@/lib/seo';

// Link previews are built from the same public lookups the pages use. Both the
// page metadata and its preview image ask for them, and so does every visitor,
// so they are cached. Five minutes also keeps the cover's presigned URL (valid
// for fifteen) usable when the image route reads it from the cache.
const SHARE_LOOKUP_REVALIDATE_SECONDS = 300;

// A cached lookup can still hand back an expired cover link: the first visit
// after a quiet spell gets the stale entry while the cache refreshes. The
// image route then asks again with `fresh`, which skips the cache.
type ShareLookupOptions = { fresh?: boolean };

function shareLookup<T>(path: string, { fresh = false }: ShareLookupOptions): Promise<T> {
    return fresh ? serverPublicGet<T>(path) : serverPublicCachedGet<T>(path, SHARE_LOOKUP_REVALIDATE_SECONDS);
}

export type ShareEvent = {
    title: string;
    subtitle: string | null;
    // The event's own description, used as the link preview text. Without one the preview uses a generic line.
    description?: string | null;
    // When and where, as one line, e.g. "Sat, 14 Nov 2026 · 18:00 – 23:00 · Villa Rosa".
    details?: string | null;
    cover: MediaResponseDto | null;
};

export type QrShareEvent = ShareEvent & { targetType: QrTargetType };

// Only an active code shows its event, matching QrCodeLandingBoundary. A code
// that leads to an invitation opens the invite page (see getQrRedirectPath),
// so it gets that page's preview, with the description, date and venue the
// code lookup leaves out.
export async function getQrShareEvent(token: string, options: ShareLookupOptions = {}): Promise<QrShareEvent | null> {
    try {
        const resolution = await shareLookup<QrLinkResolutionDto>(endpoints.qrLinks.resolve(token), options);
        if (resolution.status !== 'ACTIVE' || !resolution.eventTitle) return null;

        const leadsToInvite = resolution.targetType === 'EVENT_JOIN' || resolution.targetType === 'INVITATION';
        const inviteEvent = leadsToInvite && resolution.inviteToken ? await getInviteShareEvent(resolution.inviteToken, options) : null;
        if (inviteEvent) return { ...inviteEvent, targetType: resolution.targetType };

        return {
            title: resolution.eventTitle,
            subtitle: resolution.eventSubtitle ?? null,
            cover: resolution.coverMedia ?? null,
            targetType: resolution.targetType,
        };
    } catch {
        return null;
    }
}

// Expired and used invites show their terminal state, not the event, so they
// get the generic preview too.
export async function getInviteShareEvent(token: string, options: ShareLookupOptions = {}): Promise<ShareEvent | null> {
    try {
        const preview = await shareLookup<EventInvitationPreviewDto>(endpoints.eventInvitations.preview(token), options);
        if (preview.expired || preview.alreadyUsed) return null;

        return {
            title: preview.eventTitle,
            subtitle: preview.eventSubtitle,
            description: preview.eventDescription?.trim() || null,
            details: formatShareDetails(await getServerLocale(), preview),
            cover: preview.coverMedia,
        };
    } catch {
        return null;
    }
}

// The date, time and venue in the event's own time zone, so a server running
// in UTC still shows the times the host picked.
export function formatShareDetails(
    locale: string,
    preview: Pick<EventInvitationPreviewDto, 'eventStartAt' | 'eventEndAt' | 'eventTimezone' | 'eventLocationName'>,
): string | null {
    const when = formatEventDateParts(locale, preview.eventStartAt, preview.eventEndAt, preview.eventTimezone);
    const parts = [when?.date, when?.time, preview.eventLocationName?.trim()].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : null;
}

// The preview image renderer reads JPEG and PNG. Anything else, and videos,
// fall back to the thumbnail, which the backend always writes as JPEG.
export function coverImageUrl(cover: MediaResponseDto | null): string | null {
    if (!cover) return null;
    if (cover.mediaType === 'IMAGE' && (cover.mimeType === 'image/jpeg' || cover.mimeType === 'image/png')) return cover.mediaUrl;
    return cover.thumbnailUrl;
}

// The og:image comes from the route's opengraph-image file, which Next adds on
// its own. Without an event the preview uses the app's name and description.
// Token pages stay out of search results either way.
async function buildShareMetadata(event: ShareEvent | null, descriptionKey: 'uploadDescription' | 'inviteDescription'): Promise<Metadata> {
    const [tRoot, tShare] = await Promise.all([getTranslations('RootLayout'), getTranslations('ShareMetadata')]);
    const title = event?.title ?? tRoot('title');
    const description = event ? [event.details, event.description ?? tShare(descriptionKey)].filter(Boolean).join('. ') : tRoot('description');

    return {
        metadataBase: new URL(SITE_URL),
        title,
        description,
        openGraph: {
            type: 'website',
            siteName: tRoot('title'),
            title,
            description,
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
        },
        robots: { index: false, follow: false },
    };
}

export async function qrShareMetadata(token: string): Promise<Metadata> {
    const event = await getQrShareEvent(token);
    return buildShareMetadata(event, event?.targetType === 'MEDIA_UPLOAD' ? 'uploadDescription' : 'inviteDescription');
}

export async function inviteShareMetadata(token: string): Promise<Metadata> {
    return buildShareMetadata(await getInviteShareEvent(token), 'inviteDescription');
}
