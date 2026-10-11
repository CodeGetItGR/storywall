import '@/components/landing/landing.css';

import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getLocale, getTranslations } from 'next-intl/server';

import { CookieConsent } from '@/components/consent/CookieConsent';
import { ForBusinessApply } from '@/components/forBusiness/ForBusinessApply';
import { ForBusinessBenefits } from '@/components/forBusiness/ForBusinessBenefits';
import { ForBusinessClients } from '@/components/forBusiness/ForBusinessClients';
import { ForBusinessDestination } from '@/components/forBusiness/ForBusinessDestination';
import { ForBusinessFaq } from '@/components/forBusiness/ForBusinessFaq';
import { ForBusinessFounding } from '@/components/forBusiness/ForBusinessFounding';
import { ForBusinessHeader } from '@/components/forBusiness/ForBusinessHeader';
import { ForBusinessHero } from '@/components/forBusiness/ForBusinessHero';
import { ForBusinessLanguageBanner } from '@/components/forBusiness/ForBusinessLanguageBanner';
import { ForBusinessRoles } from '@/components/forBusiness/ForBusinessRoles';
import { ForBusinessSteps } from '@/components/forBusiness/ForBusinessSteps';
import { ForBusinessStructuredData } from '@/components/forBusiness/ForBusinessStructuredData';
import { SECONDARY_LINK } from '@/components/forBusiness/forBusinessStyles';
import { LandingDocumentScroll } from '@/components/landing/LandingDocumentScroll';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { type Locale, locales } from '@/i18n/config';
import { getForBusinessPath, getPublicLandingPath } from '@/i18n/publicLocale';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { foundingBlock } from '@/lib/forBusiness';
import { fetchPartnerProgramSummary } from '@/lib/forBusinessServer';
import { makeQueryClient } from '@/lib/queryClient';
import { LandingMotionProvider } from '@/providers/LandingMotionProvider';

// The destination weddings section is written for international professionals.
const DESTINATION_LOCALES: readonly Locale[] = ['en'];

export async function ForBusinessPage() {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('ForBusinessPage');
    const twin = locales.find((other) => other !== locale) ?? locale;
    const queryClient = makeQueryClient();

    // Best-effort, as on the landing: the footer newsletter reads the app config.
    try {
        queryClient.setQueryData(appConfigKeys.all, await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get));
    } catch {
        // useAppConfig() fetches normally on the client.
    }

    const founding = foundingBlock(await fetchPartnerProgramSummary());

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <ForBusinessStructuredData />
            <LandingDocumentScroll />
            <LandingMotionProvider>
                <main id="top" className="landing-page overflow-x-clip bg-white text-[#151313]">
                    {/* Header */}
                    <ForBusinessHeader />
                    {/* Hero */}
                    <ForBusinessHero />
                    {/* What clients get */}
                    <ForBusinessClients />
                    {/* What you get */}
                    <ForBusinessBenefits showFreeEvent={founding.kind === 'hidden'} />
                    {/* Destination weddings */}
                    {DESTINATION_LOCALES.includes(locale) && <ForBusinessDestination />}
                    {/* Founding partners */}
                    {founding.kind !== 'hidden' && <ForBusinessFounding block={founding} />}
                    {/* How it works */}
                    <ForBusinessSteps />
                    {/* Who it's for */}
                    <ForBusinessRoles />
                    {/* FAQ */}
                    <ForBusinessFaq />
                    {/* Apply */}
                    <ForBusinessApply />
                    {/* Back to the couples' page */}
                    <p className="px-5 pb-14 text-center">
                        <a href={getPublicLandingPath(locale)} className={SECONDARY_LINK}>
                            {t('links.couples')}
                        </a>
                    </p>
                    {/* Footer */}
                    <LandingFooter anchorBase={getPublicLandingPath(locale)} topHref="#top" />
                </main>
                {/* Language hint */}
                <ForBusinessLanguageBanner
                    pageLocale={locale}
                    target={twin}
                    href={getForBusinessPath(twin)}
                    text={t(`languageBanner.${twin}.text`)}
                    link={t(`languageBanner.${twin}.link`)}
                    dismiss={t(`languageBanner.${twin}.dismiss`)}
                />
                {/* Cookie consent */}
                <CookieConsent />
            </LandingMotionProvider>
        </HydrationBoundary>
    );
}
