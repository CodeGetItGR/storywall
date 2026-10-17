import '@/components/landing/landing.css';

import { getTranslations } from 'next-intl/server';

import { CookieConsent } from '@/components/consent/CookieConsent';
import { LandingDeferredExperience } from '@/components/landing/LandingDeferredExperience';
import { LandingDemo } from '@/components/landing/LandingDemo';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingFinalCta,type LandingFinalCtaCopy } from '@/components/landing/LandingFinalCta';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeroTransition } from '@/components/landing/LandingHeroTransition';
import { LandingHowItWorks } from '@/components/landing/LandingHowItWorks';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingReviews } from '@/components/landing/LandingReviews';
import { OccasionCampaignBanner } from '@/components/occasions/OccasionCampaignBanner';
import { OccasionDemoPreview } from '@/components/occasions/OccasionDemoPreview';
import { OccasionFeatures } from '@/components/occasions/OccasionFeatures';
import { OccasionHero } from '@/components/occasions/OccasionHero';
import { OccasionLinks } from '@/components/occasions/OccasionLinks';
import { OccasionPageShell } from '@/components/occasions/OccasionPageShell';
import { OccasionStory } from '@/components/occasions/OccasionStory';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import type { LandingTheme } from '@/lib/landingThemes';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';
import { type DemoPreview, hasDemoPreviewContent } from '@/lib/occasions/demoPreview';
import { occasionCreateHref } from '@/lib/occasions/occasionLinks';
import { occasionMedia } from '@/lib/occasions/occasionMedia';
import { type Occasion, occasionAlternatePaths } from '@/lib/occasions/occasions';
import type { OccasionThemeId } from '@/lib/occasions/themes';
import { LandingMotionProvider } from '@/providers/LandingMotionProvider';

type OccasionContentProps = {
    campaign: OccasionCampaign | null;
    // null → the event type has no demo; the demo band and its links are left out.
    demoHref: string | null;
    featureKeys: string[];
    locale: Locale;
    occasion: Occasion;
    preview: DemoPreview | null;
    theme: OccasionThemeId | null;
    // null hides the themes under the story.
    themes: LandingTheme[] | null;
};

type HowItWorksStep = { title: string; body: string };
type FaqItem = { q: string; a: string };

// The landing's sections, in its order, with the occasion's copy and photos.
export async function OccasionContent({ campaign, demoHref, featureKeys, locale, occasion, preview, theme, themes }: OccasionContentProps) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const landing = await getTranslations({ locale, namespace: 'LandingPage' });
    const createHref = occasionCreateHref(occasion, campaign);
    const alternatePaths = occasionAlternatePaths(occasion);
    const media = occasionMedia(occasion.eventType);
    const finalCta = { ...(t.raw('finalCta') as Omit<LandingFinalCtaCopy, 'cta'>), cta: t('hero.cta') };

    return (
        // The footer's motion toggle reads LandingMotionProvider.
        <LandingMotionProvider>
            <OccasionPageShell theme={theme}>
                {/* Campaign banner */}
                {campaign?.banner ? <OccasionCampaignBanner campaign={campaign} locale={locale} /> : null}

                {/* Hero */}
                <OccasionHero
                    alternatePaths={alternatePaths}
                    campaign={campaign}
                    createHref={createHref}
                    demoHref={demoHref}
                    feed={media?.heroFeed ?? null}
                    locale={locale}
                    occasion={occasion}
                />

                <div className="landing-page">
                    {/* How it works */}
                    <LandingHowItWorks
                        copy={{
                            eyebrow: landing('howItWorks.eyebrow'),
                            headingStart: (t.raw('howItWorksHeading') as string[])[0]!,
                            headingEnd: (t.raw('howItWorksHeading') as string[])[1]!,
                            steps: (t.raw('howItWorks') as HowItWorksStep[]).map((step) => ({ title: step.title, description: step.body })),
                        }}
                    />

                    {/* Demo band */}
                    {demoHref ? <LandingHeroTransition href={demoHref} /> : null}

                    {/* Before, on the day, after */}
                    {media ? <OccasionStory createHref={createHref} locale={locale} moments={media.moments} occasion={occasion} themes={themes} /> : null}

                    {/* Demo, with a server-rendered snapshot of it */}
                    {demoHref ? (
                        <LandingDemo heading={t.raw('demoHeading') as string[]} href={demoHref}>
                            {preview && hasDemoPreviewContent(preview) ? <OccasionDemoPreview locale={locale} preview={preview} /> : null}
                        </LandingDemo>
                    ) : null}

                    {/* Social and host experience */}
                    <LandingDeferredExperience social={{ title: t.raw('scene.title') as string[], copy: t('scene.copy') }} />

                    {/* Features */}
                    <OccasionFeatures featureKeys={featureKeys} locale={locale} occasion={occasion} />

                    {/* Reviews from this occasion */}
                    <LandingReviews eventType={occasion.eventType} />
                </div>

                {/* Plans, opened on this occasion */}
                <LandingPricing eventType={occasion.eventType} heading={t('pricingHeading')} />

                <div className="landing-page">
                    {/* FAQ */}
                    <LandingFaq
                        copy={{
                            heading: landing('faq.heading'),
                            intro: t('faqIntro'),
                            items: (t.raw('faq') as FaqItem[]).map((item) => [item.q, item.a]),
                        }}
                    />

                    {/* Final call to action */}
                    <LandingFinalCta copy={finalCta} href={createHref} image={media?.finalImage} />

                    {/* Other occasions */}
                    <OccasionLinks locale={locale} occasion={occasion} />

                    {/* Footer */}
                    <LandingFooter anchorBase={getPublicLandingPath(locale)} />
                </div>
            </OccasionPageShell>

            {/* Cookie consent */}
            <CookieConsent />
        </LandingMotionProvider>
    );
}
