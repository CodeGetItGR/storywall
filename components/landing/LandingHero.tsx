'use client';

import { useTranslations } from 'next-intl';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { LandingHeroVisual } from '@/components/landing/LandingHeroVisual';
import { LandingMotionToggle } from '@/components/landing/LandingMotionToggle';
import { LandingProfileBadge } from '@/components/landing/LandingProfileBadge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLandingMobileMenu } from '@/hooks/useLandingMobileMenu';
import { useLandingTypewriter } from '@/hooks/useLandingTypewriter';
import { routes } from '@/lib/routes';
import { useLandingMotion } from '@/providers/LandingMotionProvider';

const NAV_HREFS = ['#platformStories', '#howItWorks', '#experience', '#pricing'] as const;

type LandingHeroCtaProps = { className: string; href: string; lines: string[] };

function LandingHeroCta({ className, href, lines }: LandingHeroCtaProps) {
    return (
        <a
            className={`items-center justify-between gap-4 rounded-full bg-[linear-gradient(100deg,#ff6f93,#ff936a_52%,#ffd05b)] py-4.25 pr-4.5 pl-7.5 text-white shadow-[0_16px_32px_rgba(217,102,74,.15)] transition-transform hover:-translate-y-0.5 focus-ring focus-visible:outline-offset-4 min-[761px]:gap-2.5 min-[761px]:py-2.5 min-[761px]:pr-2.75 min-[761px]:pl-5 ${className}`}
            href={href}
        >
            <span className="flex-1 text-center font-[Baskerville,Georgia,serif] text-[24px] leading-[1.02] tracking-tight min-[421px]:text-[clamp(25px,6.2vw,34px)] min-[761px]:text-[clamp(15px,1vw,19px)]">
                {lines.map((line) => (
                    <span className="block" key={line}>
                        {line}
                    </span>
                ))}
            </span>
            <span
                aria-hidden="true"
                className="grid size-14.5 shrink-0 place-items-center rounded-full bg-white text-[36px] leading-none text-[#ee9971] min-[421px]:size-17 min-[421px]:text-[42px] min-[761px]:size-10.5 min-[761px]:text-[27px]"
            >
                ↗
            </span>
        </a>
    );
}

export function LandingHero() {
    const t = useTranslations('LandingPage.hero');
    const { isAuthenticated, isBootstrapping } = useAuth();
    const { isOpen, menuRef, toggleRef, close, toggle } = useLandingMobileMenu();
    const { paused } = useLandingMotion();
    const isSignedIn = isAuthenticated && !isBootstrapping;
    const navLabels = t.raw('nav') as string[];
    const mobileNavLabels = t.raw('mobileNav') as string[];
    const title = t.raw('title') as string[];
    const cta = t.raw('cta') as string[];
    const trustLine = t.raw('trustLine') as string[];
    const typewriterWord = useLandingTypewriter(t.raw('eventTypes') as string[], paused);

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
                        <ProtectedImage unoptimized alt="StoryWall" className="h-auto w-full" height={119} priority src="/landing/storywall.webp" width={600} />
                    </a>
                    <nav
                        aria-label={t('navLabel')}
                        className="ml-auto hidden items-center gap-[clamp(20px,2vw,38px)] whitespace-nowrap text-xs tracking-[-0.015em] min-[761px]:flex"
                    >
                        {navLabels.slice(0, -1).map((label, index) => (
                            <a
                                className="transition-opacity hover:opacity-60 focus-ring focus-visible:outline-offset-4"
                                href={NAV_HREFS[index]}
                                key={label}
                            >
                                {label}
                            </a>
                        ))}
                        {isSignedIn ? (
                            <LandingProfileBadge />
                        ) : (
                            <a className="font-bold" href={routes.login}>
                                {navLabels.at(-1)}
                            </a>
                        )}
                    </nav>
                    <LandingMotionToggle />
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
                        <a href={NAV_HREFS[index]} key={label} onClick={close}>
                            {label}
                        </a>
                    ))}
                    {isSignedIn ? (
                        <LandingProfileBadge />
                    ) : (
                        <a href={routes.login} onClick={close}>
                            {mobileNavLabels.at(-1)}
                        </a>
                    )}
                    <LanguageSwitcher className="self-start" />
                </nav>
            </header>

            {/* Hero content */}
            <div className="relative bg-[url('/landing/hero-background-v75.webp')] bg-cover bg-center pt-6 pb-21.5 min-[421px]:max-[760px]:pt-10.75 min-[761px]:min-h-[calc(100svh-112px)] min-[761px]:py-0">
                <div className="relative mx-auto grid w-[calc(100%-40px)] max-w-305 grid-cols-1 items-center min-[761px]:min-h-[calc(100svh-112px)] min-[761px]:w-[calc(100%-64px)] min-[761px]:grid-cols-2">
                    <div className="relative z-20 self-center min-[761px]:py-2.5">
                        <p className="mb-5 text-[clamp(13px,1vw,17px)] leading-tight uppercase">
                            {t('kicker')} <strong>{t('kickerStrong')}</strong>
                        </p>
                        <p
                            aria-label={t('eventTypesLabel')}
                            className="mb-5 flex min-h-8 items-baseline gap-2 whitespace-nowrap font-[Baskerville,Georgia,serif] text-[clamp(22px,1.7vw,32px)] leading-none"
                        >
                            <span>{t('eventTypesPrefix')}</span>
                            <span className="bg-[linear-gradient(90deg,#df7794,#f29365_52%,#f2c764)] bg-clip-text font-medium text-transparent">
                                {typewriterWord}
                            </span>
                            <span aria-hidden="true" className={`inline-block h-[.85em] w-0.5 bg-[#ee9971] ${paused ? '' : 'animate-pulse'}`} />
                        </p>
                        <h1
                            className="max-w-142.5 font-[Baskerville,Georgia,serif] text-[clamp(44px,13vw,64px)] leading-[.93] font-normal tracking-[-.06em] min-[761px]:text-[clamp(54px,3.45vw,70px)]"
                            id="sw-new-hero-title"
                        >
                            {title.map((line) => (
                                <span className="block" key={line}>
                                    {line}
                                </span>
                            ))}
                        </h1>
                        <div className={'flex'}>
                            <LandingHeroCta
                                className="mx-auto  md:ml-44 lg:ml-68 hidden min-[761px]:mt-6.5 min-[761px]:flex min-[761px]:h-15.5 min-[761px]:w-[min(228px,52%)]"
                                href={isSignedIn ? routes.home : routes.register}
                                lines={cta}
                            />
                        </div>
                        <p className="mt-8 max-w-135 text-[clamp(18px,1.35vw,24px)] leading-[1.35]">
                            {t('subtitleStart')} <strong>{t('subtitleStrong')}</strong> {t('subtitleEnd')}
                            <br />
                            {t('subtitleSecondLine')}
                        </p>
                        <p className="mt-5 flex flex-wrap gap-y-1 text-[clamp(11px,.8vw,13px)] leading-normal font-bold">
                            {trustLine.map((item, index) => (
                                <span className="whitespace-nowrap" key={item}>
                                    {index > 0 && (
                                        <span aria-hidden="true" className="mx-2 text-[#ee9971]">
                                            ·
                                        </span>
                                    )}
                                    {item}
                                </span>
                            ))}
                        </p>
                    </div>
                    <LandingHeroVisual />
                    <LandingHeroCta
                        className="order-3 mx-auto mt-[34vw] h-23 w-[min(415px,78vw)] flex min-[421px]:h-28 min-[761px]:hidden"
                        href={isSignedIn ? routes.home : routes.register}
                        lines={cta}
                    />
                </div>
            </div>
        </section>
    );
}
