'use client';

import { useTranslations } from 'next-intl';

import { HeroBackground } from '@/components/landing/HeroBackground';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHeroActions } from '@/components/landing/LandingHeroActions';
import { LandingHeroTypewriter } from '@/components/landing/LandingHeroTypewriter';
import { LandingHeroVisual } from '@/components/landing/LandingHeroVisual';
import { useLandingSignedIn } from '@/hooks/useLandingSignedIn';
import { landingHeroMainAction } from '@/lib/landingHero';
import { useLandingMotion } from '@/providers/LandingMotionProvider';

const NAV_HREFS = ['#platformStories', '#howItWorks', '#experience', '#pricing'] as const;

export function LandingHero() {
    const t = useTranslations('LandingPage.hero');
    const isSignedIn = useLandingSignedIn();
    const { paused } = useLandingMotion();
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
            <div className="relative pt-6 pb-21.5 min-[421px]:max-[760px]:pt-10.75 min-[761px]:min-h-[calc(100svh-112px)] min-[761px]:py-0">
                {/* Background */}
                <HeroBackground />
                <div className="relative mx-auto grid w-[calc(100%-40px)] max-w-305 grid-cols-1 items-center min-[761px]:min-h-[calc(100svh-112px)] min-[761px]:w-[calc(100%-64px)] min-[761px]:grid-cols-2">
                    <div className="relative z-20 self-center min-[761px]:py-2.5">
                        {/* Kicker */}
                        <p className="mb-2.5 font-[Arial,Helvetica,sans-serif] text-[clamp(16px,4.6vw,22px)] leading-[1.2] font-medium tracking-[-.01em] uppercase min-[761px]:mb-3 min-[761px]:ml-[7px] min-[761px]:text-[clamp(13px,.9vw,17px)] min-[761px]:tracking-[-.02em]">
                            {t.rich('kicker', { strong: (chunks) => <strong className="font-bold">{chunks}</strong> })}
                        </p>

                        {/* Event types */}
                        <LandingHeroTypewriter
                            label={t('typewriter.label')}
                            motionPaused={paused}
                            prefix={t('typewriter.prefix')}
                            words={t.raw('typewriter.words') as string[]}
                        />

                        {/* Title */}
                        <h1
                            className="max-w-142.5 font-[Baskerville,Georgia,serif] text-[clamp(36px,10.5vw,52px)] leading-[.98] font-normal tracking-[-.05em] text-balance min-[761px]:text-[clamp(46px,3.2vw,64px)]"
                            id="sw-new-hero-title"
                        >
                            {t('title')}
                        </h1>

                        {/* Summary */}
                        <p className="mt-5 max-w-135 text-[clamp(18px,1.35vw,22px)] leading-[1.35] text-balance">{t('subtitle')}</p>

                        {/* Actions */}
                        <LandingHeroActions demoLabel={t('demoCta')} main={mainAction} mainLabel={mainLabel} />
                    </div>
                    <LandingHeroVisual motionPaused={paused} />
                </div>
            </div>
        </section>
    );
}
