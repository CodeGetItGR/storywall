import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { getMessages } from 'next-intl/server';
import { type ReactNode } from 'react';

import { RootDocument } from '@/components/layout/RootDocument';
import { SiteNoticeBar } from '@/components/siteNotices/SiteNoticeBar';
import { siteNoticeKeys } from '@/hooks/useSiteNotices';
import { pickPublicMessages } from '@/i18n/publicMessages';
import { makeQueryClient } from '@/lib/queryClient';
import { getRootMetadata, rootViewport } from '@/lib/rootMetadata';
import { DISMISSED_COOKIE } from '@/lib/siteNoticeDismissals';
import { fetchLiveSiteNotices } from '@/lib/siteNotices.server';
import { PublicProviders } from '@/providers/PublicProviders';

export const viewport: Viewport = rootViewport;

export function generateMetadata(): Promise<Metadata> {
    return getRootMetadata();
}

// A root layout of its own, separate from app/(main), so Next.js does a full
// page load whenever a visitor leaves the landing page. The trimmed message
// set below can then never follow them into the app.
export default async function LandingLayout({ children }: Readonly<{ children: ReactNode }>) {
    const queryClient = makeQueryClient();
    // Public and the same for everyone: cached for a minute, never throws (see siteNotices.server.ts).
    try {
        queryClient.setQueryData(siteNoticeKeys.live(), await fetchLiveSiteNotices());
    } catch {
        // The bar fetches the list itself.
    }
    const dismissed = (await cookies()).get(DISMISSED_COOKIE)?.value ?? '';

    return (
        <RootDocument documentScroll messages={pickPublicMessages(await getMessages())}>
            <PublicProviders>
                <HydrationBoundary state={dehydrate(queryClient)}>
                    {/* Notice */}
                    <SiteNoticeBar area="PUBLIC" initialDismissed={dismissed} />
                    {children}
                </HydrationBoundary>
            </PublicProviders>
        </RootDocument>
    );
}
