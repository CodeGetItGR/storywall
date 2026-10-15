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
import { OccasionPageShell } from '@/components/occasions/OccasionPageShell';
import { OccasionPlans } from '@/components/occasions/OccasionPlans';
import { OccasionScene } from '@/components/occasions/OccasionScene';
import { OccasionStory } from '@/components/occasions/OccasionStory';
import { OccasionThemes } from '@/components/occasions/OccasionThemes';
import { OccasionTimeline } from '@/components/occasions/OccasionTimeline';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import type { ThemePresetDto } from '@/lib/api/types';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';
import type { DemoPreview } from '@/lib/occasions/demoPreview';
import { occasionCreateHref } from '@/lib/occasions/occasionLinks';
import { occasionMedia } from '@/lib/occasions/occasionMedia';
import { type Occasion, occasionAlternatePaths } from '@/lib/occasions/occasions';
import type { OccasionThemeId } from '@/lib/occasions/themes';
import { LandingMotionProvider } from '@/providers/LandingMotionProvider';

type OccasionContentProps = {
    campaign: OccasionCampaign | null;
    featureKeys: string[];
    locale: Locale;
    occasion: Occasion;
    preview: DemoPreview | null;
    theme: OccasionThemeId | null;
    // null hides the themes row.
    themePresets: ThemePresetDto[] | null;
};

export function OccasionContent({ campaign, featureKeys, locale, occasion, preview, theme, themePresets }: OccasionContentProps) {
    const createHref = occasionCreateHref(occasion, campaign);
    const alternatePaths = occasionAlternatePaths(occasion);
    const hasPreview = preview && (preview.posts.length > 0 || preview.photos.length > 0 || preview.wishes.length > 0);
    // An occasion without media yet gets the plain sections.
    const media = occasionMedia(occasion.eventType);

    return (
        // The footer's motion toggle reads LandingMotionProvider.
        <LandingMotionProvider>
            <OccasionPageShell theme={theme}>
                {/* Campaign banner */}
                {campaign?.banner ? <OccasionCampaignBanner campaign={campaign} locale={locale} /> : null}

                {/* Header */}
                <OccasionHeader alternatePaths={alternatePaths} createHref={createHref} locale={locale} />

                {/* Hero */}
                <OccasionHero campaign={campaign} createHref={createHref} floats={media?.heroFloats ?? []} locale={locale} occasion={occasion} />

                {/* Themes */}
                {themePresets ? <OccasionThemes createHref={createHref} locale={locale} occasion={occasion} presets={themePresets} /> : null}

                {/* Before, on the day, after */}
                {media ? (
                    <OccasionStory locale={locale} moments={media.moments} occasion={occasion} />
                ) : (
                    <OccasionTimeline locale={locale} occasion={occasion} />
                )}

                {/* Everything in one place */}
                {media ? <OccasionScene locale={locale} occasion={occasion} /> : null}

                {/* Features */}
                <OccasionFeatures featureKeys={featureKeys} locale={locale} occasion={occasion} />

                {/* Demo preview */}
                {hasPreview ? <OccasionDemoPreview locale={locale} occasion={occasion} preview={preview} /> : null}

                {/* How it works */}
                <OccasionHowItWorks locale={locale} occasion={occasion} />

                {/* Plans */}
                <OccasionPlans locale={locale} />

                {/* FAQ */}
                <OccasionFaq locale={locale} occasion={occasion} />

                {/* Final call to action */}
                <OccasionFinalCta
                    createHref={createHref}
                    image={media?.finalImage ?? null}
                    locale={locale}
                    occasion={occasion}
                />

                {/* Other occasions */}
                <OccasionLinks locale={locale} occasion={occasion} />

                {/* Footer */}
                <LandingFooter alternatePaths={alternatePaths} anchorBase={getPublicLandingPath(locale)} />
            </OccasionPageShell>

            {/* Cookie consent */}
            <CookieConsent />
        </LandingMotionProvider>
    );
}
