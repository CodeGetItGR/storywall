import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { endpoints } from '@/lib/api/endpoints';
import { serverPublicCachedGet } from '@/lib/api/serverFetch';
import type { EventInvitationPreviewDto, MediaResponseDto, QrLinkResolutionDto, QrTargetType } from '@/lib/api/types';
import { SITE_URL } from '@/lib/seo';

// Link previews are built from the same public lookups the pages use. Both the
// page metadata and its preview image ask for them, and so does every visitor,
// so they are cached. Five minutes also keeps the cover's presigned URL (valid
// for fifteen) usable when the image route reads it from the cache.
const SHARE_LOOKUP_REVALIDATE_SECONDS = 300;

export type ShareEvent = {
    title: string;
    subtitle: string | null;
    cover: MediaResponseDto | null;
};

export type QrShareEvent = ShareEvent & { targetType: QrTargetType };

// Only an active code shows its event, matching QrCodeLandingBoundary.
export async function getQrShareEvent(token: string): Promise<QrShareEvent | null> {
    try {
        const resolution = await serverPublicCachedGet<QrLinkResolutionDto>(endpoints.qrLinks.resolve(token), SHARE_LOOKUP_REVALIDATE_SECONDS);
        if (resolution.status !== 'ACTIVE' || !resolution.eventTitle) return null;

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
export async function getInviteShareEvent(token: string): Promise<ShareEvent | null> {
    try {
        const preview = await serverPublicCachedGet<EventInvitationPreviewDto>(
            endpoints.eventInvitations.preview(token),
            SHARE_LOOKUP_REVALIDATE_SECONDS,
        );
        if (preview.expired || preview.alreadyUsed) return null;

        return { title: preview.eventTitle, subtitle: preview.eventSubtitle, cover: preview.coverMedia };
    } catch {
        return null;
    }
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
    const description = event ? tShare(descriptionKey) : tRoot('description');

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
