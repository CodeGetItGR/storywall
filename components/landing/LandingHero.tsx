'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { LandingHeroVisual } from '@/components/landing/LandingHeroVisual';
import { LandingProfileBadge } from '@/components/landing/LandingProfileBadge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';

const NAV_HREFS = ['#platformStories', '#demo', '#experience', '#pricing', routes.login] as const;

export function LandingHero() {
    const t = useTranslations('LandingPage.hero');
    const { isAuthenticated, isBootstrapping } = useAuth();
    const navLabels = t.raw('nav') as string[];
    const mobileNavLabels = t.raw('mobileNav') as string[];
    const title = t.raw('title') as string[];
    const cta = t.raw('cta') as string[];
    const signedInCta = t.raw('signedInCta') as string[];
    const isSignedIn = isAuthenticated && !isBootstrapping;

    return (
        <motion.section aria-labelledby="sw-new-hero-title" className="sw-new-hero" id="top-preview">
            {/* Header */}
            <header className="sw-new-hero-header">
                <div className="sw-new-hero-header-inner">
                    <a aria-label={t('homeLabel')} className="sw-new-hero-logo" href="#top-preview">
                        <Image alt="StoryWall" src="/landing/storywall.png" width={600} height={119} unoptimized />
                    </a>
                    <nav aria-label={t('navLabel')} className="sw-new-hero-nav">
                        {navLabels.slice(0, -1).map((label, index) => (
                            <a href={NAV_HREFS[index]} key={label}>
                                {label}
                            </a>
                        ))}
                        {isSignedIn ? <LandingProfileBadge /> : <a href={routes.login}>{navLabels.at(-1)}</a>}
                    </nav>
                    <LanguageSwitcher className="sw-new-hero-language-switcher" />
                    <button
                        aria-controls="sw-mobile-menu-panel"
                        aria-expanded="false"
                        aria-label={t('openMenu')}
                        className="sw-mobile-menu-toggle"
                        data-close-label={t('closeMenu')}
                        data-open-label={t('openMenu')}
                        type="button"
                    >
                        <span />
                        <span />
                    </button>
                </div>
                {/* Mobile menu */}
                <nav aria-hidden="true" aria-label={t('mobileNavLabel')} className="sw-mobile-menu-panel" id="sw-mobile-menu-panel">
                    {mobileNavLabels.slice(0, -1).map((label, index) => (
                        <a href={NAV_HREFS[index]} key={label}>
                            {label}
                        </a>
                    ))}
                    {isSignedIn ? <LandingProfileBadge /> : <a href={routes.login}>{mobileNavLabels.at(-1)}</a>}
                    <LanguageSwitcher className="sw-mobile-menu-language-switcher" />
                </nav>
            </header>
            {/* Hero content */}
            <div className="sw-new-hero-stage">
                <div className="sw-new-hero-inner">
                    <div className="sw-new-hero-copy">
                        <p className="sw-new-hero-kicker">
                            {t('kicker')} <strong>{t('kickerStrong')}</strong>
                        </p>
                        <h1 className="sw-new-hero-title" id="sw-new-hero-title">
                            {title.map((line) => (
                                <span key={line}>{line}</span>
                            ))}
                        </h1>
                        <a className="sw-new-hero-cta" href={isSignedIn ? routes.home : routes.register}>
                            <span className="sw-new-hero-cta-label">
                                <span>{isSignedIn ? signedInCta[0] : cta[0]}</span>
                                <span>{isSignedIn ? signedInCta[1] : cta[1]}</span>
                            </span>
                            <span aria-hidden="true" className="sw-new-hero-arrow">
                                ↗
                            </span>
                        </a>
                        <p className="sw-new-hero-subtitle">
                            {t('subtitleStart')} <strong>{t('subtitleStrong')}</strong> {t('subtitleEnd')}
                            <br />
                            {t('subtitleSecondLine')}
                        </p>
                    </div>
                    <LandingHeroVisual />
                </div>
            </div>
        </motion.section>
    );
}
