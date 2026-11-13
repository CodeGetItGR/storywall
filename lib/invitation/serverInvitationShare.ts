import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { publishedInvitationShareImagePath } from '@/lib/invitation/inviteHost';
import { invitationLanguage } from '@/lib/invitation/labels';
import type { PublishedInvitation } from '@/lib/invitation/publishedInvitation';
import { fetchPublishedInvitation } from '@/lib/invitation/serverPublishedInvitation';
import { invitationShareDetails, type InvitationShareImage, invitationShareImages, invitationShareTitle } from '@/lib/invitation/sharePreview';
import { invitationCardOgImage } from '@/lib/og/ogImages';
import { cropSharePhoto } from '@/lib/og/sharePhoto';
import { absoluteUrl, OG_IMAGE_SIZE } from '@/lib/seo';

// Server-only: the link preview of a live invitation, in the invitation's own language.

type ShareCopy = { title: string; details: string | null; imageAlt: string };

async function shareCopy(invitation: PublishedInvitation): Promise<ShareCopy> {
    const t = await getTranslations({ locale: invitationLanguage(invitation.document), namespace: 'PublishedInvitation' });
    const names = invitationShareTitle(invitation.document);
    return {
        title: names ?? t('metaTitle'),
        details: invitationShareDetails(invitation.document),
        imageAlt: names ? t('shareImageAlt', { names }) : t('metaTitle'),
    };
}

// The title doubles as the tab title. Without a date or place there is no description at all,
// rather than the site's own line.
export async function publishedInvitationShareMetadata(slug: string, invitation: PublishedInvitation): Promise<Metadata> {
    const { title, details, imageAlt } = await shareCopy(invitation);
    const image = {
        url: absoluteUrl(publishedInvitationShareImagePath(slug, invitation.publishedAt)),
        ...OG_IMAGE_SIZE,
        alt: imageAlt,
        type: 'image/jpeg',
    };
    const description = details ?? undefined;
    return {
        title,
        description: details,
        openGraph: { type: 'website', title, description, images: [image] },
        twitter: { card: 'summary_large_image', title, description, images: [image] },
    };
}

async function drawShareImage(image: InvitationShareImage): Promise<Buffer | null> {
    if (image.kind === 'photo') return cropSharePhoto(image.url);
    try {
        return await invitationCardOgImage(image);
    } catch {
        return null;
    }
}

// The picture, drawn afresh from the live invitation: its image links expire, this one doesn't.
// A photo that fails to load gives way to the next picture, down to the card.
export async function publishedInvitationShareImage(slug: string): Promise<Response> {
    const state = await fetchPublishedInvitation(slug);
    if (state.kind === 'not-found' || state.kind === 'expired') return new Response(null, { status: 404 });
    if (state.kind === 'error') return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });

    const { title } = await shareCopy(state.invitation);
    for (const image of invitationShareImages(state.invitation, title)) {
        const jpeg = await drawShareImage(image);
        if (!jpeg) continue;
        return new Response(new Uint8Array(jpeg), {
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=3600',
                'X-Robots-Tag': 'noindex',
            },
        });
    }
    return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
