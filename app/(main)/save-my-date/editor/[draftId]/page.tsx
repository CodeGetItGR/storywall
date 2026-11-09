import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/serverFetch';
import { prefetchAccessToken } from '@/lib/auth/serverEventContext';
import { type InvitationDraftDto, invitationDraftKeys } from '@/lib/invitation/drafts';
import { fetchUploadedFonts } from '@/lib/invitation/serverUploadedFonts';
import { makeQueryClient } from '@/lib/queryClient';
import { showsSaveMyDate } from '@/lib/saveMyDateRelease';
import { NO_INDEX } from '@/lib/seo';

import InvitationEditorPage from './PageClient';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('InvitationEditor');
    return { title: t('metaTitle'), robots: NO_INDEX };
}

type PageProps = { params: Promise<{ draftId: string }> };

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
