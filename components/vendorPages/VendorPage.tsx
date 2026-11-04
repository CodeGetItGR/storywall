import '@/components/landing/landing.css';

import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getLocale } from 'next-intl/server';

import { CookieConsent } from '@/components/consent/CookieConsent';
import { ForBusinessHeader } from '@/components/forBusiness/ForBusinessHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { GradientIconDefs } from '@/components/vendorPages/GradientIcon';
import { VendorPageAlways } from '@/components/vendorPages/VendorPageAlways';
import { VendorPageApply } from '@/components/vendorPages/VendorPageApply';
import { VendorPageFaq } from '@/components/vendorPages/VendorPageFaq';
import { VendorPageHero } from '@/components/vendorPages/VendorPageHero';
import { VendorPageLinks } from '@/components/vendorPages/VendorPageLinks';
import { VendorPagePartner } from '@/components/vendorPages/VendorPagePartner';
import { VendorPageShell } from '@/components/vendorPages/VendorPageShell';
import { VendorPageSteps } from '@/components/vendorPages/VendorPageSteps';
import { VendorPageStructuredData } from '@/components/vendorPages/VendorPageStructuredData';
import { VendorPageTools } from '@/components/vendorPages/VendorPageTools';
import { appConfigKeys } from '@/hooks/useAppConfig';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath, type VendorPageType } from '@/i18n/publicLocale';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { makeQueryClient } from '@/lib/queryClient';
import { vendorPageHasTools } from '@/lib/vendorPages';
import { LandingMotionProvider } from '@/providers/LandingMotionProvider';

// One page per vendor type, under the partner page.
export async function VendorPage({ type }: { type: VendorPageType }) {
    const locale = (await getLocale()) as Locale;
    const queryClient = makeQueryClient();

    // Best-effort, as on the partner page: the footer newsletter reads the app config.
    try {
        queryClient.setQueryData(appConfigKeys.all, await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get));
    } catch {
        // useAppConfig() fetches normally on the client.
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <VendorPageStructuredData type={type} />
            <LandingMotionProvider>
                <VendorPageShell>
                    <GradientIconDefs />
                    {/* Header */}
                    <ForBusinessHeader />
                    {/* Hero */}
                    <VendorPageHero type={type} />
                    {/* Tools, or what every vendor gets in their place */}
                    {vendorPageHasTools(type) ? <VendorPageTools type={type} /> : <VendorPageAlways banded />}
                    {/* Every event */}
                    {vendorPageHasTools(type) && <VendorPageAlways />}
                    {/* Partner program */}
                    <VendorPagePartner type={type} />
                    {/* How you start */}
                    <VendorPageSteps />
                    {/* FAQ */}
                    <VendorPageFaq type={type} />
                    {/* Apply */}
                    <VendorPageApply type={type} />
                    {/* Other professionals */}
                    <VendorPageLinks type={type} />
                    {/* Footer */}
                    <LandingFooter anchorBase={getPublicLandingPath(locale)} topHref="#top" />
                </VendorPageShell>
                {/* Cookie consent */}
                <CookieConsent />
            </LandingMotionProvider>
        </HydrationBoundary>
    );
}
