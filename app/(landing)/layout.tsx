import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { getMessages, getTranslations } from 'next-intl/server';
import { type ReactNode } from 'react';

import { CreateEventDialogHost } from '@/components/event/create/wizard/CreateEventDialogHost';
import { LinkClickTracker } from '@/components/landing/LinkClickTracker';
import { RootDocument } from '@/components/layout/RootDocument';
import { SiteNoticeStickyBar } from '@/components/siteNotices/SiteNoticeStickyBar';
import { siteNoticeKeys } from '@/hooks/useSiteNotices';
import { pickPublicMessages } from '@/i18n/publicMessages';
import { discountCampaignKeys } from '@/lib/discountCampaign';
import { fetchLiveDiscountCampaign } from '@/lib/discountCampaign.server';
import { makeQueryClient } from '@/lib/queryClient';
import { getRootMetadata, rootViewport } from '@/lib/rootMetadata';
import { DISMISSED_COOKIE } from '@/lib/siteNoticeDismissals';
import { fetchLiveSiteNotices } from '@/lib/siteNotices.server';
import { showsCreateWizard } from '@/lib/unreleasedPages';
import { CreateWizardFlagProvider } from '@/providers/CreateWizardFlagProvider';
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
        <RootDocument documentScroll messages={pickPublicMessages(await getMessages())}>
            <PublicProviders>
                <CreateWizardFlagProvider enabled={showsCreateWizard()} createLabel={createLabel}>
                    <HydrationBoundary state={dehydrate(queryClient)}>
                        {/* Notice */}
                        <SiteNoticeStickyBar initialDismissed={dismissed} />
                        {children}
                    </HydrationBoundary>
                    {/* Create wizard */}
                    <CreateEventDialogHost />
                </CreateWizardFlagProvider>
                <LinkClickTracker />
            </PublicProviders>
        </RootDocument>
    );
}
