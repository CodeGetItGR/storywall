'use client';

import { useTranslations } from 'next-intl';

export function LandingHeroTransition() {
    const t = useTranslations('LandingPage.transition');

    return (
        <section aria-label={t('label')} className="sw-hero-transition-strip">
            <div className="sw-hero-transition-inner">
                <div className="sw-hero-transition-slogan">
                    {t('slogan')} <strong>{t('brand')}</strong>
                </div>
                <a className="sw-hero-transition-cta" href="#demo">
                    <span>{t('cta')}</span>
                    <span aria-hidden="true">↗</span>
                </a>
            </div>
        </section>
    );
}
