import '@/components/landing/landing.css';

import { getTranslations } from 'next-intl/server';

import { CookieConsent } from '@/components/consent/CookieConsent';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingFinalCta, type LandingFinalCtaCopy } from '@/components/landing/LandingFinalCta';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHowItWorks } from '@/components/landing/LandingHowItWorks';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { OccasionPageShell } from '@/components/occasions/OccasionPageShell';
import { QrWeddingGuide } from '@/components/qrWedding/QrWeddingGuide';
import { QrWeddingHero } from '@/components/qrWedding/QrWeddingHero';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { WEDDING_FINAL_CTA_IMAGE } from '@/lib/occasions/weddingMedia';
import { QR_WEDDING_CREATE_HREF } from '@/lib/qrWeddingPage';
import type { FaqEntry } from '@/lib/structuredData';
import { LandingMotionProvider } from '@/providers/LandingMotionProvider';

type HowItWorksStep = { title: string; body: string };

// The landing's sections around the guide, with the wedding plans and the wedding photo.
export async function QrWeddingContent({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage' });
    const landing = await getTranslations({ locale, namespace: 'LandingPage' });
    const howItWorksHeading = t.raw('howItWorksHeading') as string[];
    const finalCta = { ...(t.raw('finalCta') as Omit<LandingFinalCtaCopy, 'cta'>), cta: t('hero.cta') };

    return (
        // The footer's motion toggle reads LandingMotionProvider.
        <LandingMotionProvider>
            <OccasionPageShell theme={null}>
                {/* Hero */}
                <QrWeddingHero locale={locale} />

                <div className="landing-page">
                    {/* How it works */}
                    <LandingHowItWorks
                        copy={{
                            headingStart: howItWorksHeading[0]!,
                            headingEnd: howItWorksHeading[1]!,
                            steps: (t.raw('howItWorks') as HowItWorksStep[]).map((step) => ({ title: step.title, description: step.body })),
                        }}
                    />

                    {/* Guide */}
                    <QrWeddingGuide locale={locale} />
                </div>

                {/* Plans for weddings */}
                <LandingPricing eventType="WEDDING" heading={t('pricingHeading')} />

                <div className="landing-page">
                    {/* FAQ */}
                    <LandingFaq
                        copy={{
                            heading: landing('faq.heading'),
                            intro: t('faqIntro'),
                            items: (t.raw('faq') as FaqEntry[]).map((item) => [item.q, item.a]),
                        }}
                    />

                    {/* Final call to action */}
                    <LandingFinalCta copy={finalCta} href={QR_WEDDING_CREATE_HREF} image={WEDDING_FINAL_CTA_IMAGE} />

                    {/* Footer */}
                    <LandingFooter anchorBase={getPublicLandingPath(locale)} />
                </div>
            </OccasionPageShell>

            {/* Cookie consent */}
            <CookieConsent />
        </LandingMotionProvider>
    );
}
