'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { LandingHeroVisual } from '@/components/landing/LandingHeroVisual';

const NAV_HREFS = ['#platformStories', '#demo', '#experience', '#pricing', '#'] as const;

export function LandingHero() {
    const t = useTranslations('LandingPage.hero');
    const navLabels = t.raw('nav') as string[];
    const mobileNavLabels = t.raw('mobileNav') as string[];
    const title = t.raw('title') as string[];
    const cta = t.raw('cta') as string[];

    return (
        <motion.section aria-labelledby="sw-new-hero-title" className="sw-new-hero" id="top-preview">
            <header className="sw-new-hero-header">
                <div className="sw-new-hero-header-inner">
                    <a aria-label={t('homeLabel')} className="sw-new-hero-logo" href="#top-preview">
                        <Image alt="StoryWall" src="/landing/storywall.png" width={600} height={119} unoptimized />
                    </a>
                    <nav aria-label={t('navLabel')} className="sw-new-hero-nav">
                        {navLabels.map((label, index) => (
                            <a href={NAV_HREFS[index]} key={label}>
                                {label}
                            </a>
                        ))}
                    </nav>
                    <button
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
                <nav aria-label={t('mobileNavLabel')} className="sw-mobile-menu-panel">
                    {mobileNavLabels.map((label, index) => (
                        <a href={NAV_HREFS[index]} key={label}>
                            {label}
                        </a>
                    ))}
                </nav>
            </header>
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
                        <a className="sw-new-hero-cta" href="#">
                            <span className="sw-new-hero-cta-label">
                                <span>{cta[0]}</span>
                                <span>{cta[1]}</span>
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
