import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { getMessages, getTranslations } from 'next-intl/server';
import { type ReactNode } from 'react';

import { RootDocument } from '@/components/layout/RootDocument';
import { SiteNoticeFrame } from '@/components/siteNotices/SiteNoticeFrame';
import { siteNoticeKeys } from '@/hooks/useSiteNotices';
import { pickAppMessages } from '@/i18n/appMessages';
import { resolveServerSession } from '@/lib/auth/serverEventContext';
import { discountCampaignKeys } from '@/lib/discountCampaign';
import { fetchLiveDiscountCampaign } from '@/lib/discountCampaign.server';
import { makeQueryClient } from '@/lib/queryClient';
import { getRootMetadata, rootViewport } from '@/lib/rootMetadata';
import { DISMISSED_COOKIE } from '@/lib/siteNoticeDismissals';
import { fetchLiveSiteNotices } from '@/lib/siteNotices.server';
import { showsCreateWizard } from '@/lib/unreleasedPages';
import { AppProviders } from '@/providers/AppProviders';
import { CreateWizardFlagProvider } from '@/providers/CreateWizardFlagProvider';

export const viewport: Viewport = rootViewport;

export function generateMetadata(): Promise<Metadata> {
    return getRootMetadata();
}

// A full page load of a signed-in page hands the browser the session the
// server already holds, so the app doesn't ask for a new token before showing
// the page. Null on public pages, in-app navigations and ended sessions.
export default async function MainLayout({ children }: Readonly<{ children: ReactNode }>) {
    const handoff = await resolveServerSession();
    const queryClient = makeQueryClient();
    // Public and the same for everyone: cached for a minute, never throw (see the .server files).
    try {
        const [notices, campaign] = await Promise.all([fetchLiveSiteNotices(), fetchLiveDiscountCampaign()]);
        queryClient.setQueryData(siteNoticeKeys.live(), notices);
        queryClient.setQueryData(discountCampaignKeys.live(), campaign);
    } catch {
        // The bar fetches them itself.
    }
    const dismissed = (await cookies()).get(DISMISSED_COOKIE)?.value ?? '';

    const createLabel = (await getTranslations('CreateEventPage'))('title');

    return (
        <RootDocument messages={pickAppMessages(await getMessages())}>
            <AppProviders handoff={handoff}>
                <CreateWizardFlagProvider enabled={showsCreateWizard()} createLabel={createLabel}>
                    <HydrationBoundary state={dehydrate(queryClient)}>
                        <SiteNoticeFrame initialDismissed={dismissed}>{children}</SiteNoticeFrame>
                    </HydrationBoundary>
                </CreateWizardFlagProvider>
            </AppProviders>
        </RootDocument>
    );
}
