import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { cache } from 'react';

import { getServerLocale } from '@/i18n/serverLocale';
import { clientIpFrom, clientIpHeaders } from '@/lib/auth/springAuth';
import { isInvitationSlug } from '@/lib/invitation/inviteHost';
import {
    publicInvitationEndpoint,
    type PublishedInvitationLabels,
    type PublishedInvitationState,
    publishedInvitationState,
} from '@/lib/invitation/publishedInvitation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

// Server-only: a published invitation by its link, for the guests' page. Never cached, because the image
// URLs expire. The guest's address goes along, so each guest counts against the backend's rate limit
// alone instead of every guest sharing this server's. Cached per request, so the page and its metadata
// make one call.
export const fetchPublishedInvitation = cache(async (slug: string): Promise<PublishedInvitationState> => {
    if (!isInvitationSlug(slug)) return { kind: 'not-found' };
    try {
        const [locale, requestHeaders] = await Promise.all([getServerLocale(), headers()]);
        const res = await fetch(`${API_BASE_URL}${publicInvitationEndpoint(slug)}`, {
            headers: { 'Accept-Language': locale, ...clientIpHeaders(clientIpFrom(requestHeaders)) },
            cache: 'no-store',
        });
        const body = res.status === 200 ? await res.json() : null;
        return publishedInvitationState(res.status, body);
    } catch {
        return { kind: 'error' };
    }
});

// The error state reuses the editor's load message and the shared retry label.
export async function getPublishedInvitationLabels(): Promise<PublishedInvitationLabels> {
    const [t, editor, errors] = await Promise.all([
        getTranslations('PublishedInvitation'),
        getTranslations('InvitationEditor'),
        getTranslations('PageErrorState'),
    ]);
    return {
        title: t('metaTitle'),
        notFound: t('notFound'),
        expired: t('expired'),
        loadFailed: editor('loadFailed'),
        retry: errors('retry'),
    };
}
