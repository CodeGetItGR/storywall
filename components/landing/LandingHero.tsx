'use client';

import { useTranslations } from 'next-intl';
import { preload } from 'react-dom';

import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHeroActions } from '@/components/landing/LandingHeroActions';
import { LandingHeroVisual } from '@/components/landing/LandingHeroVisual';
import { useAuth } from '@/hooks/useAuth';
import { landingHeroMainAction } from '@/lib/landingHero';
import { useLandingMotion } from '@/providers/LandingMotionProvider';

// Same file as the hero content's background class, which Tailwind needs written out in full.
const HERO_BACKGROUND = '/landing/hero-background-v75.webp';

const NAV_HREFS = ['#platformStories', '#howItWorks', '#experience', '#pricing'] as const;

export function LandingHero() {
    // A CSS background is found only once the stylesheet is applied; preloading starts it with the page.
    preload(HERO_BACKGROUND, { as: 'image', fetchPriority: 'high' });
    const t = useTranslations('LandingPage.hero');
    const { isAuthenticated, isBootstrapping } = useAuth();
    const { paused } = useLandingMotion();
    const isSignedIn = isAuthenticated && !isBootstrapping;
    const navLabels = t.raw('nav') as string[];
    const mobileNavLabels = t.raw('mobileNav') as string[];
    const mainAction = landingHeroMainAction(isSignedIn);
    const mainLabel = isSignedIn ? t('signedInCta') : t('plansCta');

    return (
        <section
            aria-labelledby="sw-new-hero-title"
            className="relative isolate overflow-hidden bg-white text-[#151313] min-[761px]:min-h-svh"
            id="top-preview"
        >
            {/* Header */}
            <LandingHeader
                homeHref="#top-preview"
                links={NAV_HREFS.map((href, index) => ({ href, label: navLabels[index]!, mobileLabel: mobileNavLabels[index]! }))}
                loginLabel={navLabels.at(-1)!}
                mobileLoginLabel={mobileNavLabels.at(-1)!}
            />

            {/* Hero content */}
            <div className="relative bg-[url('/landing/hero-background-v75.webp')] bg-cover bg-center pt-6 pb-21.5 min-[421px]:max-[760px]:pt-10.75 min-[761px]:min-h-[calc(100svh-112px)] min-[761px]:py-0">
                <div className="relative mx-auto grid w-[calc(100%-40px)] max-w-305 grid-cols-1 items-center min-[761px]:min-h-[calc(100svh-112px)] min-[761px]:w-[calc(100%-64px)] min-[761px]:grid-cols-2">
                    <div className="relative z-20 self-center min-[761px]:py-2.5">
                        {/* Title */}
                        <h1
                            className="max-w-142.5 font-[Baskerville,Georgia,serif] text-[clamp(36px,10.5vw,52px)] leading-[.98] font-normal tracking-[-.05em] text-balance min-[761px]:text-[clamp(46px,3.2vw,64px)]"
                            id="sw-new-hero-title"
                        >
                            {t('title')}
                        </h1>

                        {/* Summary */}
                        <p className="mt-5 max-w-135 text-[clamp(18px,1.35vw,22px)] leading-[1.35] text-balance">{t('subtitle')}</p>
                        <p className="mt-3 text-[clamp(14px,1vw,16px)] leading-snug text-[#151313]/70">{t('eventTypes')}</p>

                        {/* Actions */}
                        <LandingHeroActions demoLabel={t('demoCta')} main={mainAction} mainLabel={mainLabel} />
                    </div>
                    <LandingHeroVisual motionPaused={paused} />
                </div>
            </div>
        </section>
    );
}
