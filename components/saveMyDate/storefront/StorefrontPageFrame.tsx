import '@/components/landing/landing.css';

import { dehydrate, HydrationBoundary,type QueryClient } from '@tanstack/react-query';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { CookieConsent } from '@/components/consent/CookieConsent';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { appConfigKeys } from '@/hooks/useAppConfig';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { jsonLdHtml } from '@/lib/seo';
import { LandingMotionProvider } from '@/providers/LandingMotionProvider';

type StorefrontPageFrameProps = {
    locale: Locale;
    // The same page in each language, for the header's language switch.
    alternatePaths: Record<Locale, string>;
    // Already holds the page's own prefetched data.
    queryClient: QueryClient;
    structuredData: unknown;
    children: ReactNode;
};

// The landing's header and footer around a catalogue or theme page, with its prefetched data and JSON-LD.
export async function StorefrontPageFrame({ locale, alternatePaths, queryClient, structuredData, children }: StorefrontPageFrameProps) {
    const landing = await getTranslations({ locale, namespace: 'LandingPage.hero' });

    // Best-effort, as on the partner page: the footer's newsletter reads the app config.
    try {
        queryClient.setQueryData(appConfigKeys.all, await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get));
    } catch {
        // useAppConfig() fetches normally on the client.
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            {structuredData ? <script dangerouslySetInnerHTML={{ __html: jsonLdHtml(structuredData) }} type="application/ld+json" /> : null}
            {/* The footer's motion toggle reads LandingMotionProvider */}
            <LandingMotionProvider>
                <main className="overflow-x-clip bg-white text-[#151313]" id="top">
                    {/* Header */}
                    <LandingHeader
                        alternatePaths={alternatePaths}
                        homeHref={getPublicLandingPath(locale)}
                        links={[]}
                        loginLabel={(landing.raw('nav') as string[]).at(-1)!}
                        mobileLoginLabel={(landing.raw('mobileNav') as string[]).at(-1)!}
                    />

                    {children}

                    {/* Footer */}
                    <LandingFooter anchorBase={getPublicLandingPath(locale)} topHref="#top" />
                </main>
                {/* Cookie consent */}
                <CookieConsent />
            </LandingMotionProvider>
        </HydrationBoundary>
    );
}
