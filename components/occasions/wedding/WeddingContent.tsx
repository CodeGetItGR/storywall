import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { CookieConsent } from '@/components/consent/CookieConsent';
import { LandingDemo } from '@/components/landing/LandingDemo';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingFinalCta, type LandingFinalCtaCopy } from '@/components/landing/LandingFinalCta';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeroTransition } from '@/components/landing/LandingHeroTransition';
import { LandingHowItWorks } from '@/components/landing/LandingHowItWorks';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingReviews } from '@/components/landing/LandingReviews';
import { OccasionCampaignBanner } from '@/components/occasions/OccasionCampaignBanner';
import { OccasionLinks } from '@/components/occasions/OccasionLinks';
import { OccasionPageShell } from '@/components/occasions/OccasionPageShell';
import { WeddingFaqAnswer } from '@/components/occasions/wedding/WeddingFaqAnswer';
import { WeddingFeatures } from '@/components/occasions/wedding/WeddingFeatures';
import { WeddingHero } from '@/components/occasions/wedding/WeddingHero';
import { WeddingPrivate } from '@/components/occasions/wedding/WeddingPrivate';
import { WeddingRsvp } from '@/components/occasions/wedding/WeddingRsvp';
import { WeddingWhy } from '@/components/occasions/wedding/WeddingWhy';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { LANDING_TOKENS_CLASS } from '@/lib/landingTokens';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';
import { occasionFaqEntries, type OccasionFaqEntry, occasionFaqLinkHref } from '@/lib/occasions/occasionFaq';
import { occasionCreateHref } from '@/lib/occasions/occasionLinks';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';
import { type Occasion, occasionAlternatePaths } from '@/lib/occasions/occasions';
import type { OccasionThemeId } from '@/lib/occasions/themes';
import { WEDDING_FINAL_CTA_IMAGE } from '@/lib/occasions/weddingMedia';
import { LandingMotionProvider } from '@/providers/LandingMotionProvider';

// A three-line demo heading tops out smaller on desktop, so it fits beside the phones.
const DEMO_LONG_HEADING_CLASS = 'min-[761px]:text-[clamp(54px,4.5vw,72px)]';

type HowCopy = { heading: [string, string]; kicker: string; steps: { title: string }[] };

type WeddingContentProps = {
    campaign: OccasionCampaign | null;
    // null: no wedding demo; the demo band, the demo and the hero's demo link are left out.
    demoHref: string | null;
    featureKeys: string[];
    locale: Locale;
    occasion: Occasion;
    price: OccasionPriceValues;
    // The QR wedding page while it is live, else null.
    qrHref: string | null;
    theme: OccasionThemeId | null;
};

// The wedding page, section by section as in the design, with the landing's shared sections.
export async function WeddingContent({ campaign, demoHref, featureKeys, locale, occasion, price, qrHref, theme }: WeddingContentProps) {
    const t = await getTranslations({ locale, namespace: 'OccasionPages.WEDDING' });
    const landing = await getTranslations({ locale, namespace: 'LandingPage' });
    const createHref = occasionCreateHref(occasion, campaign);
    const bold = (chunks: ReactNode) => <strong className="font-bold">{chunks}</strong>;
    const how = t.raw('how') as HowCopy;
    const demoHeading = t.raw('demo.heading') as string[];
    const faq = occasionFaqEntries(t.raw('faq') as OccasionFaqEntry[], (key) => t(key, price)).map((entry): [string, ReactNode] => [
        entry.q,
        <WeddingFaqAnswer
            answer={entry.a}
            href={entry.link ? occasionFaqLinkHref(entry.link.to, qrHref) : null}
            key={entry.q}
            label={entry.link?.label}
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
                <WeddingHero
                    alternatePaths={occasionAlternatePaths(occasion)}
                    campaign={campaign}
                    createHref={createHref}
                    demoHref={demoHref}
                    locale={locale}
                    price={price}
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

                {/* Demo band, down to the demo */}
                {demoHref ? <LandingHeroTransition href="#demo" /> : null}

                {/* Why StoryWall */}
                <WeddingWhy locale={locale} qrHref={qrHref} />

                {/* RSVP */}
                <WeddingRsvp locale={locale} />

                {/* Private social */}
                <WeddingPrivate locale={locale} />

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
                <WeddingFeatures featureKeys={featureKeys} locale={locale} />

                {/* Reviews from weddings */}
                <LandingReviews eventType={occasion.eventType} />

                {/* Plans */}
                <LandingPricing
                    eventType={occasion.eventType}
                    heading={t('pricing.heading')}
                    intro={t('pricing.intro')}
                    kicker={t('pricing.kicker')}
                />

                {/* FAQ, one answer open at a time */}
                <LandingFaq centered copy={{ heading: landing('faq.heading'), intro: t('faqIntro'), items: faq }} group="wedding-faq" />

                {/* Final call to action */}
                <LandingFinalCta centered copy={finalCta} href={createHref} image={WEDDING_FINAL_CTA_IMAGE} />

                {/* Other occasions */}
                <OccasionLinks locale={locale} occasion={occasion} />

                {/* Footer */}
                <LandingFooter anchorBase={getPublicLandingPath(locale)} />
            </OccasionPageShell>

            {/* Cookie consent */}
            <CookieConsent />
        </LandingMotionProvider>
    );
}
