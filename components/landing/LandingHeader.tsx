'use client';

import { useTranslations } from 'next-intl';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { LandingMotionToggle } from '@/components/landing/LandingMotionToggle';
import { LandingProfileBadge } from '@/components/landing/LandingProfileBadge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLandingMobileMenu } from '@/hooks/useLandingMobileMenu';
import type { Locale } from '@/i18n/config';
import { landingClickAttributes, landingNavTarget } from '@/lib/landingTracking';
import { routes } from '@/lib/routes';

// One in-page link: the header's label, and the mobile menu's.
export type LandingHeaderLink = { href: string; label: string; mobileLabel: string };

type LandingHeaderProps = {
    // The page's own URL in each language (occasion pages).
    alternatePaths?: Partial<Record<Locale, string>>;
    // Where the logo goes: the top of the landing, or the landing from an occasion page.
    homeHref: string;
    links: LandingHeaderLink[];
    loginLabel: string;
    mobileLoginLabel: string;
};

export function LandingHeader({ alternatePaths, homeHref, links, loginLabel, mobileLoginLabel }: LandingHeaderProps) {
    const t = useTranslations('LandingPage.hero');
    const { isAuthenticated, isBootstrapping } = useAuth();
    const { isOpen, menuRef, toggleRef, close, toggle } = useLandingMobileMenu();
    const isSignedIn = isAuthenticated && !isBootstrapping;

    return (
        <header className="relative z-30 h-20 bg-white/95 min-[421px]:max-[760px]:h-31 min-[761px]:h-28 min-[761px]:backdrop-blur-sm">
            <div className="mx-auto flex h-full w-[calc(100%-40px)] max-w-305 items-center justify-between gap-6 min-[761px]:w-[calc(100%-64px)]">
                {/* Logo */}
                <a
                    aria-label={t('homeLabel')}
                    className="inline-flex w-[min(196px,49vw)] shrink-0 items-center min-[761px]:w-[clamp(200px,14vw,260px)]"
                    href={homeHref}
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

                {/* Navigation */}
                <nav
                    aria-label={t('navLabel')}
                    className="ml-auto hidden items-center gap-[clamp(20px,2vw,38px)] text-xs tracking-[-0.015em] whitespace-nowrap min-[761px]:flex"
                >
                    {links.map((link) => (
                        <a
                            className="focus-ring transition-opacity hover:opacity-60 focus-visible:outline-offset-4"
                            href={link.href}
                            key={link.href}
                            {...landingClickAttributes({ event: 'nav', placement: 'header', target: landingNavTarget(link.href) })}
                        >
                            {link.label}
                        </a>
                    ))}
                    {isSignedIn ? (
                        <LandingProfileBadge />
                    ) : (
                        <a className="font-bold" href={routes.login} {...landingClickAttributes({ event: 'login', placement: 'header' })}>
                            {loginLabel}
                        </a>
                    )}
                </nav>
                <LanguageSwitcher alternatePaths={alternatePaths} className="hidden shrink-0 min-[761px]:inline-flex" />

                {/* Menu button */}
                <button
                    aria-controls="landing-mobile-menu"
                    aria-expanded={isOpen}
                    aria-label={isOpen ? t('closeMenu') : t('openMenu')}
                    className="flex size-11 shrink-0 flex-col items-center justify-center gap-1.5 rounded-full border border-[#151313]/20 min-[761px]:hidden"
                    onClick={toggle}
                    ref={toggleRef}
                    type="button"
                >
                    <span className={`h-px w-5 bg-[#151313] transition-transform duration-200 ${isOpen ? 'translate-y-[3.5px] rotate-45' : ''}`} />
                    <span className={`h-px w-5 bg-[#151313] transition-transform duration-200 ${isOpen ? '-translate-y-[3.5px] -rotate-45' : ''}`} />
                </button>
            </div>

            {/* Mobile navigation */}
            <nav
                aria-label={t('mobileNavLabel')}
                className={`${isOpen ? 'flex' : 'hidden'} absolute inset-x-0 top-full z-30 flex-col gap-5 bg-white px-6 py-6 shadow-[0_12px_28px_rgba(21,19,19,.1)] min-[761px]:hidden`}
                id="landing-mobile-menu"
                ref={menuRef}
            >
                {links.map((link) => (
                    <a
                        href={link.href}
                        key={link.href}
                        onClick={close}
                        {...landingClickAttributes({ event: 'nav', placement: 'mobile_menu', target: landingNavTarget(link.href) })}
                    >
                        {link.mobileLabel}
                    </a>
                ))}
                {isSignedIn ? (
                    <LandingProfileBadge />
                ) : (
                    <a href={routes.login} onClick={close} {...landingClickAttributes({ event: 'login', placement: 'mobile_menu' })}>
                        {mobileLoginLabel}
                    </a>
                )}
                <LanguageSwitcher alternatePaths={alternatePaths} className="self-start" />
                <LandingMotionToggle className="self-start text-[13px] text-[#151313]/62" />
            </nav>
        </header>
    );
}
