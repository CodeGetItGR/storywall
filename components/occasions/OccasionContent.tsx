import '@/components/landing/landing.css';

import { CookieConsent } from '@/components/consent/CookieConsent';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { OccasionCampaignBanner } from '@/components/occasions/OccasionCampaignBanner';
import { OccasionDemoPreview } from '@/components/occasions/OccasionDemoPreview';
import { OccasionFaq } from '@/components/occasions/OccasionFaq';
import { OccasionFeatures } from '@/components/occasions/OccasionFeatures';
import { OccasionFinalCta } from '@/components/occasions/OccasionFinalCta';
import { OccasionHeader } from '@/components/occasions/OccasionHeader';
import { OccasionHero } from '@/components/occasions/OccasionHero';
import { OccasionHowItWorks } from '@/components/occasions/OccasionHowItWorks';
import { OccasionLinks } from '@/components/occasions/OccasionLinks';
import { OccasionPlans } from '@/components/occasions/OccasionPlans';
import { OccasionTimeline } from '@/components/occasions/OccasionTimeline';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';
import type { DemoPreview } from '@/lib/occasions/demoPreview';
import { occasionCreateHref } from '@/lib/occasions/occasionLinks';
import { type Occasion, occasionAlternatePaths } from '@/lib/occasions/occasions';
import type { OccasionThemeId } from '@/lib/occasions/themes';
import { LandingMotionProvider } from '@/providers/LandingMotionProvider';

type OccasionContentProps = {
    campaign: OccasionCampaign | null;
    locale: Locale;
    occasion: Occasion;
    preview: DemoPreview | null;
    theme: OccasionThemeId | null;
};

export function OccasionContent({ campaign, locale, occasion, preview, theme }: OccasionContentProps) {
    const createHref = occasionCreateHref(occasion, campaign);
    const alternatePaths = occasionAlternatePaths(occasion);
    const hasPreview = preview && (preview.posts.length > 0 || preview.photos.length > 0 || preview.wishes.length > 0);

    return (
        // The footer's motion toggle reads LandingMotionProvider.
        <LandingMotionProvider>
            <main className="occasion-page overflow-x-clip bg-white text-[#151313]" data-occasion-theme={theme ?? undefined} id="top-preview">
                {/* Campaign banner */}
                {campaign?.banner ? <OccasionCampaignBanner campaign={campaign} locale={locale} /> : null}

                {/* Header */}
                <OccasionHeader alternatePaths={alternatePaths} createHref={createHref} locale={locale} />

                {/* Hero */}
                <OccasionHero campaign={campaign} createHref={createHref} locale={locale} occasion={occasion} />

                {/* Before, during, after */}
                <OccasionTimeline locale={locale} occasion={occasion} />

                {/* Features */}
                <OccasionFeatures locale={locale} occasion={occasion} />

                {/* Demo preview */}
                {hasPreview ? <OccasionDemoPreview locale={locale} occasion={occasion} preview={preview} /> : null}

                {/* How it works */}
                <OccasionHowItWorks locale={locale} occasion={occasion} />

                {/* Plans */}
                <OccasionPlans locale={locale} />

                {/* FAQ */}
                <OccasionFaq locale={locale} occasion={occasion} />

                {/* Final call to action */}
                <OccasionFinalCta alternatePaths={alternatePaths} createHref={createHref} locale={locale} occasion={occasion} />

                {/* Other occasions */}
                <OccasionLinks locale={locale} occasion={occasion} />

                {/* Footer */}
                <LandingFooter anchorBase={getPublicLandingPath(locale)} />
            </main>

            {/* Cookie consent */}
            <CookieConsent />
        </LandingMotionProvider>
    );
}
