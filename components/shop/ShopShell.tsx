import '@/components/landing/landing.css';

import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { CookieConsent } from '@/components/consent/CookieConsent';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { ShopHeader } from '@/components/shop/ShopHeader';
import { appConfigKeys } from '@/hooks/useAppConfig';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { makeQueryClient } from '@/lib/queryClient';
import { LandingMotionProvider } from '@/providers/LandingMotionProvider';

// The landing's header and footer around a shop page.
export async function ShopShell({ locale, alternatePaths, children }: { locale: Locale; alternatePaths: Record<Locale, string>; children: ReactNode }) {
    const queryClient = makeQueryClient();
    // Best-effort, as on the landing: the footer newsletter reads the app config.
    try {
        queryClient.setQueryData(appConfigKeys.all, await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get));
    } catch {
        // useAppConfig() fetches normally on the client.
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <LandingMotionProvider>
                <div id="top" className="landing-page overflow-x-clip">
                    {/* Header */}
                    <ShopHeader locale={locale} alternatePaths={alternatePaths} />
                    {/* Content */}
                    {children}
                    {/* Footer */}
                    <LandingFooter anchorBase={getPublicLandingPath(locale)} topHref="#top" />
                </div>
                {/* Cookie consent */}
                <CookieConsent />
            </LandingMotionProvider>
        </HydrationBoundary>
    );
}
