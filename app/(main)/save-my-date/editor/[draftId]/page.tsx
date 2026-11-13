import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { eventKeys } from '@/hooks/useEvent';
import { qrLinkKeys } from '@/hooks/useQrLinks';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { serverGet, serverPublicCachedGetOrNull } from '@/lib/api/serverFetch';
import type { EventDetailResponseDto, QrLinkResponseDto } from '@/lib/api/types';
import { prefetchAccessToken } from '@/lib/auth/serverEventContext';
import { type InvitationDraftDto, invitationDraftKeys } from '@/lib/invitation/drafts';
import { THEME_CATALOGUE_REVALIDATE_SECONDS } from '@/lib/invitation/serverThemeCatalogue';
import { fetchUploadedFonts } from '@/lib/invitation/serverUploadedFonts';
import { invitationThemeKeys, type ThemeSamples } from '@/lib/invitation/themeCatalogue';
import { invitationThemeEndpoint, type InvitationThemePublicDto } from '@/lib/invitation/themePreview';
import { makeQueryClient } from '@/lib/queryClient';
import { showsSaveMyDate } from '@/lib/saveMyDateRelease';
import { NO_INDEX } from '@/lib/seo';

import InvitationEditorPage from './PageClient';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('InvitationEditor');
    return { title: t('metaTitle'), robots: NO_INDEX };
}

type PageProps = { params: Promise<{ draftId: string }> };

// What the draft follows (KAN-84): its event, the event's guest link and its theme's sample content, the same
// queries useInvitationEventSync makes.
async function prefetchEvent(queryClient: ReturnType<typeof makeQueryClient>, draft: InvitationDraftDto, eventId: string, accessToken: string) {
    const themeSlug = draft.themeSlug;
    await Promise.all([
        themeSlug
            ? serverPublicCachedGetOrNull<InvitationThemePublicDto>(invitationThemeEndpoint(themeSlug), THEME_CATALOGUE_REVALIDATE_SECONDS)
                  .then((theme) => {
                      if (theme) queryClient.setQueryData<ThemeSamples>(invitationThemeKeys.samples(themeSlug), { document: theme.document, assetUrls: theme.assetUrls });
                  })
                  .catch(() => {})
            : null,
        serverGet<EventDetailResponseDto>(endpoints.events.byId(eventId), accessToken)
            .then((event) => queryClient.setQueryData(eventKeys.detail(eventId), event))
            .catch(() => {}),
        serverGet<QrLinkResponseDto[]>(endpoints.events.qrLinks(eventId), accessToken)
            .then((links) => queryClient.setQueryData(qrLinkKeys.list(eventId), normalizeList(links).items))
            .catch(() => {}),
    ]);
}

// The invitation editor. Signed in only (proxy.ts); the backend decides who may open the draft.
export default async function Page({ params }: PageProps) {
    if (!showsSaveMyDate()) notFound();
    const { draftId } = await params;
    const queryClient = makeQueryClient();
    const accessToken = await prefetchAccessToken();

    // True when the draft is in the cache for this page.
    const [uploadedFonts, prefetched] = await Promise.all([
        fetchUploadedFonts(),
        (async () => {
            if (!accessToken) return false;
            try {
                const draft = await serverGet<InvitationDraftDto>(endpoints.invitationDrafts.byId(draftId), accessToken);
                queryClient.setQueryData(invitationDraftKeys.detail(draftId), draft);
                if (draft.eventId) await prefetchEvent(queryClient, draft, draft.eventId, accessToken);
                return true;
            } catch {
                // Best-effort: the editor loads the draft itself.
                return false;
            }
        })(),
    ]);

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <InvitationEditorPage draftId={draftId} uploadedFonts={uploadedFonts} prefetched={prefetched} />
        </HydrationBoundary>
    );
}
