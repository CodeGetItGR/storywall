'use client';

import './landing.css';

import { useRef } from 'react';

import { LandingDemo } from '@/components/landing/LandingDemo';
import { LandingExperienceStack } from '@/components/landing/LandingExperienceStack';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { LandingFinalCta } from '@/components/landing/LandingFinalCta';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingHeroTransition } from '@/components/landing/LandingHeroTransition';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingStories } from '@/components/landing/LandingStories';
import { useLandingInteractions } from '@/hooks/useLandingInteractions';

export function LandingContent() {
    const landingRef = useRef<HTMLElement>(null);
    useLandingInteractions(landingRef);

    return (
        <main ref={landingRef} className="landing-page fixed inset-0 overflow-y-auto overflow-x-hidden">
            {/* Hero */}
            <LandingHero />

            {/* Hero transition */}
            <LandingHeroTransition />

            {/* Event stories */}
            <LandingStories />

            {/* Demo */}
            <LandingDemo />

            {/* Social and host experience */}
            <LandingExperienceStack />

            {/* Features */}
            <LandingFeatures />

            {/* Pricing */}
            <LandingPricing />

            {/* FAQ */}
            <LandingFaq />

            {/* Final call to action */}
            <LandingFinalCta />

            {/* Footer */}
            <LandingFooter />
        </main>
    );
}
