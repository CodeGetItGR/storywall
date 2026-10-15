'use client';

import { useTranslations } from 'next-intl';
import { preload } from 'react-dom';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { LandingHeroActions } from '@/components/landing/LandingHeroActions';
import { LandingHeroVisual } from '@/components/landing/LandingHeroVisual';
import { LandingMotionToggle } from '@/components/landing/LandingMotionToggle';
import { LandingProfileBadge } from '@/components/landing/LandingProfileBadge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLandingMobileMenu } from '@/hooks/useLandingMobileMenu';
import { landingHeroMainAction } from '@/lib/landingHero';
import { landingClickAttributes, landingNavTarget } from '@/lib/landingTracking';
import { routes } from '@/lib/routes';
import { useLandingMotion } from '@/providers/LandingMotionProvider';

// Same file as the hero content's background class, which Tailwind needs written out in full.
const HERO_BACKGROUND = '/landing/hero-background-v75.webp';

const NAV_HREFS = ['#platformStories', '#howItWorks', '#experience', '#pricing'] as const;

export function LandingHero() {
    // A CSS background is found only once the stylesheet is applied; preloading starts it with the page.
    preload(HERO_BACKGROUND, { as: 'image', fetchPriority: 'high' });
    const t = useTranslations('LandingPage.hero');
    const { isAuthenticated, isBootstrapping } = useAuth();
    const { isOpen, menuRef, toggleRef, close, toggle } = useLandingMobileMenu();
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
            <header className="relative z-30 h-20 bg-white/95 min-[421px]:max-[760px]:h-31 min-[761px]:h-28 min-[761px]:backdrop-blur-sm">
                <div className="mx-auto flex h-full w-[calc(100%-40px)] max-w-305 items-center justify-between gap-6 min-[761px]:w-[calc(100%-64px)]">
                    <a
                        aria-label={t('homeLabel')}
                        className="inline-flex w-[min(196px,49vw)] shrink-0 items-center min-[761px]:w-[clamp(200px,14vw,260px)]"
                        href="#top-preview"
                    >
                        <ProtectedImage
                            unoptimized
                            alt="StoryWall"
                            className="h-auto w-full"
                            height={119}
                            priority
                            src="/landing/storywall.webp"
                            width={600}
                        />
                    </a>
                    <nav
                        aria-label={t('navLabel')}
                        className="ml-auto hidden items-center gap-[clamp(20px,2vw,38px)] text-xs tracking-[-0.015em] whitespace-nowrap min-[761px]:flex"
                    >
                        {navLabels.slice(0, -1).map((label, index) => (
                            <a
                                className="focus-ring transition-opacity hover:opacity-60 focus-visible:outline-offset-4"
                                href={NAV_HREFS[index]}
                                key={label}
                                {...landingClickAttributes({ event: 'nav', placement: 'header', target: landingNavTarget(NAV_HREFS[index]) })}
                            >
                                {label}
                            </a>
                        ))}
                        {isSignedIn ? (
                            <LandingProfileBadge />
                        ) : (
                            <a className="font-bold" href={routes.login} {...landingClickAttributes({ event: 'login', placement: 'header' })}>
                                {navLabels.at(-1)}
                            </a>
                        )}
                    </nav>
                    <LanguageSwitcher className="hidden shrink-0 min-[761px]:inline-flex" />
                    <button
                        aria-controls="landing-mobile-menu"
                        aria-expanded={isOpen}
                        aria-label={isOpen ? t('closeMenu') : t('openMenu')}
                        className="flex size-11 shrink-0 flex-col items-center justify-center gap-1.5 rounded-full border border-[#151313]/20 min-[761px]:hidden"
                        onClick={toggle}
                        ref={toggleRef}
                        type="button"
                    >
                        <span
                            className={`h-px w-5 bg-[#151313] transition-transform duration-200 ${isOpen ? 'translate-y-[3.5px] rotate-45' : ''}`}
                        />
                        <span
                            className={`h-px w-5 bg-[#151313] transition-transform duration-200 ${isOpen ? '-translate-y-[3.5px] -rotate-45' : ''}`}
                        />
                    </button>
                </div>
                {/* Mobile navigation */}
                <nav
                    aria-label={t('mobileNavLabel')}
                    className={`${isOpen ? 'flex' : 'hidden'} absolute inset-x-0 top-full z-30 flex-col gap-5 bg-white px-6 py-6 shadow-[0_12px_28px_rgba(21,19,19,.1)] min-[761px]:hidden`}
                    id="landing-mobile-menu"
                    ref={menuRef}
                >
                    {mobileNavLabels.slice(0, -1).map((label, index) => (
                        <a
                            href={NAV_HREFS[index]}
                            key={label}
                            onClick={close}
                            {...landingClickAttributes({ event: 'nav', placement: 'mobile_menu', target: landingNavTarget(NAV_HREFS[index]) })}
                        >
                            {label}
                        </a>
                    ))}
                    {isSignedIn ? (
                        <LandingProfileBadge />
                    ) : (
                        <a href={routes.login} onClick={close} {...landingClickAttributes({ event: 'login', placement: 'mobile_menu' })}>
                            {mobileNavLabels.at(-1)}
                        </a>
                    )}
                    <LanguageSwitcher className="self-start" />
                    <LandingMotionToggle className="self-start text-[13px] text-[#151313]/62" />
                </nav>
            </header>

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
