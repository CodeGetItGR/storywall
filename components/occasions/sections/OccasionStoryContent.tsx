import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { CookieConsent } from '@/components/consent/CookieConsent';
import { InviartOccasionSection } from '@/components/inviart/InviartOccasionSection';
import { LandingDemo } from '@/components/landing/LandingDemo';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingFinalCta, type LandingFinalCtaCopy } from '@/components/landing/LandingFinalCta';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeroTransition } from '@/components/landing/LandingHeroTransition';
import { LandingHowItWorks } from '@/components/landing/LandingHowItWorks';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingReviews } from '@/components/landing/LandingReviews';
import { LandingSaleButton } from '@/components/landing/LandingSaleButton';
import { OccasionCampaignBanner } from '@/components/occasions/OccasionCampaignBanner';
import { OccasionLinks } from '@/components/occasions/OccasionLinks';
import { OccasionPageShell } from '@/components/occasions/OccasionPageShell';
import { FaqAnswer } from '@/components/occasions/sections/FaqAnswer';
import { FeaturesSection } from '@/components/occasions/sections/FeaturesSection';
import { HeroSection } from '@/components/occasions/sections/HeroSection';
import { PrivateSection } from '@/components/occasions/sections/PrivateSection';
import { RsvpSection } from '@/components/occasions/sections/RsvpSection';
import { ThemesSection } from '@/components/occasions/sections/ThemesSection';
import { WhySection } from '@/components/occasions/sections/WhySection';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import type { LandingTheme } from '@/lib/landingThemes';
import { LANDING_TOKENS_CLASS } from '@/lib/landingTokens';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';
import { occasionFaqEntries, type OccasionFaqEntry, occasionFaqLinkHref } from '@/lib/occasions/occasionFaq';
import type { OccasionLengthValues } from '@/lib/occasions/occasionLength';
import { occasionCreateHref } from '@/lib/occasions/occasionLinks';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';
import type { Occasion } from '@/lib/occasions/occasions';
import { OCCASION_SECTION_IDS } from '@/lib/occasions/occasionSections';
import type { OccasionPageConfig } from '@/lib/occasions/pageConfig';
import type { OccasionThemeId } from '@/lib/occasions/themes';
import { LandingMotionProvider } from '@/providers/LandingMotionProvider';

// A three-line demo heading tops out smaller on desktop, so it fits beside the phones.
const DEMO_LONG_HEADING_CLASS = 'min-[761px]:text-[clamp(54px,4.5vw,72px)]';

type HowCopy = { heading: [string, string]; kicker: string; steps: { title: string }[] };

type OccasionStoryContentProps = {
    campaign: OccasionCampaign | null;
    config: OccasionPageConfig;
    // null: no demo; the demo band, the demo and the hero's demo link are left out.
    demoHref: string | null;
    featureKeys: string[];
    length: OccasionLengthValues;
    locale: Locale;
    occasion: Occasion;
    price: OccasionPriceValues;
    // The QR wedding page while it is live and the page links to it, else null.
    qrHref: string | null;
    theme: OccasionThemeId | null;
    // The live theme presets while the page shows its Themes section, else null.
    themes: LandingTheme[] | null;
};

// A redesigned occasion page (wedding, baptism), section by section as in the design, with the landing's shared sections.
export async function OccasionStoryContent({
    campaign,
    config,
    demoHref,
    featureKeys,
    length,
    locale,
    occasion,
    price,
    qrHref,
    theme,
    themes,
}: OccasionStoryContentProps) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const landing = await getTranslations({ locale, namespace: 'LandingPage' });
    const createHref = occasionCreateHref(occasion, campaign);
    const { media } = config;
    // Without a demo, the band and the hero's second button go to the themes.
    const themesHref = themes ? `#${OCCASION_SECTION_IDS.themes}` : null;
    const bold = (chunks: ReactNode) => <strong className="font-bold">{chunks}</strong>;
    const how = t.raw('how') as HowCopy;
    // Only a page with a demo has demo copy.
    const demoHeading = demoHref ? (t.raw('demo.heading') as string[]) : [];
    const faq = occasionFaqEntries(t.raw('faq') as OccasionFaqEntry[], (key) => t(key, { ...price, ...length })).map((entry): [string, ReactNode] => [
        entry.q,
        <FaqAnswer
            answer={entry.a}
            href={entry.link ? occasionFaqLinkHref(entry.link.to, qrHref) : null}
            key={entry.q}
            label={entry.link?.label}
            toQrPage={entry.link?.to === 'qr'}
        />,
    ]);
    const finalCta: LandingFinalCtaCopy = { ...(t.raw('finalCta') as LandingFinalCtaCopy), cta: t.rich('finalCta.cta', { b: bold }) };

    return (
        // The footer's motion toggle and the marquee read LandingMotionProvider.
        <LandingMotionProvider>
            <OccasionPageShell className={LANDING_TOKENS_CLASS} theme={theme}>
                {/* Campaign banner */}
                {campaign?.banner ? <OccasionCampaignBanner campaign={campaign} locale={locale} /> : null}

                {/* Hero */}
                <HeroSection
                    campaign={campaign}
                    createHref={createHref}
                    demoHref={demoHref}
                    locale={locale}
                    media={media}
                    occasion={occasion}
                    price={price}
                    qrHref={qrHref}
                    themesHref={themesHref}
                />

                {/* How it works */}
                <LandingHowItWorks
                    copy={{
                        eyebrow: how.kicker,
                        headingStart: how.heading[0],
                        headingEnd: how.heading[1],
                        steps: how.steps.map((step, index) => ({ title: step.title, description: t.rich(`how.steps.${index}.body`, { b: bold }) })),
                    }}
                />

                {/* Band, down to the demo or the themes */}
                {demoHref ? (
                    <LandingHeroTransition href="#demo" />
                ) : themesHref ? (
                    <LandingHeroTransition
                        click={{ event: 'nav', placement: 'hero_band', target: 'themes' }}
                        cta={t('band.cta')}
                        href={themesHref}
                        label={t('band.label')}
                    />
                ) : null}

                {/* Why StoryWall */}
                <WhySection guestPhotos={config.guestPhotos} locale={locale} media={media} occasion={occasion} qrHref={qrHref} />

                {/* RSVP */}
                <RsvpSection locale={locale} media={media} occasion={occasion} />

                {/* Private social */}
                <PrivateSection locale={locale} occasion={occasion} />

                {/* Themes */}
                {themes ? <ThemesSection createHref={createHref} locale={locale} media={media} occasion={occasion} themes={themes} /> : null}

                {/* Demo */}
                {demoHref ? (
                    <LandingDemo
                        copy={t.rich('demo.copy', { b: bold, br: () => <br /> })}
                        eyebrow={t('demo.kicker')}
                        heading={demoHeading}
                        headingClassName={demoHeading.length > 2 ? DEMO_LONG_HEADING_CLASS : undefined}
                        href={demoHref}
                        imageAlt={t('demo.imageAlt')}
                    />
                ) : null}

                {/* Features */}
                <FeaturesSection featureKeys={featureKeys} locale={locale} occasion={occasion} />

                {/* Reviews from this occasion */}
                <LandingReviews eventType={occasion.eventType} />

                {/* Plans */}
                <LandingPricing
                    eventType={occasion.eventType}
                    heading={t('pricing.heading')}
                    intro={t('pricing.intro')}
                    kicker={t('pricing.kicker')}
                />

                {/* INVIART */}
                <InviartOccasionSection eventType={occasion.eventType} locale={locale} />

                {/* FAQ, one answer open at a time */}
                <LandingFaq centered copy={{ heading: landing('faq.heading'), intro: t('faqIntro'), items: faq }} group={`${occasion.eventType.toLowerCase()}-faq`} />

                {/* Final call to action */}
                <LandingFinalCta centered copy={finalCta} href={createHref} image={media.finalCtaImage} />

                {/* Other occasions */}
                <OccasionLinks locale={locale} occasion={occasion} />

                {/* Footer */}
                <LandingFooter anchorBase={getPublicLandingPath(locale)} />
            </OccasionPageShell>

            {/* Sale button */}
            <LandingSaleButton />

            {/* Cookie consent */}
            <CookieConsent />
        </LandingMotionProvider>
    );
}
