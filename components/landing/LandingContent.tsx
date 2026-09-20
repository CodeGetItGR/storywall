import './landing.css';

import { LandingDeferredExperience } from '@/components/landing/LandingDeferredExperience';
import { LandingDemo } from '@/components/landing/LandingDemo';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingFeatureDetails } from '@/components/landing/LandingFeatureDetails';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { LandingFinalCta } from '@/components/landing/LandingFinalCta';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingHeroTransition } from '@/components/landing/LandingHeroTransition';
import { LandingHowItWorks } from '@/components/landing/LandingHowItWorks';
import { LandingPageShell } from '@/components/landing/LandingPageShell';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingStories } from '@/components/landing/LandingStories';

export function LandingContent() {
    return (
        <LandingPageShell>
            {/* Hero */}
            <LandingHero />

            <div className="landing-page">
                {/* How it works */}
                <LandingHowItWorks />

                {/* Hero transition */}
                <LandingHeroTransition />

                {/* Event stories */}
                <LandingStories />

                {/* Demo */}
                <LandingDemo />

                {/* Social and host experience */}
                <LandingDeferredExperience />

                {/* Features */}
                <LandingFeatures />

                {/* Feature details */}
                <LandingFeatureDetails />
            </div>

            {/* Pricing */}
            <LandingPricing />

            <div className="landing-page">
                {/* FAQ */}
                <LandingFaq />

                {/* Final call to action */}
                <LandingFinalCta />

                {/* Footer */}
                <LandingFooter />
            </div>
        </LandingPageShell>
    );
}
