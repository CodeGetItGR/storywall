'use client';

import { useTranslations } from 'next-intl';

import { LandingFeatureItem } from '@/components/landing/LandingFeatureItem';

const FEATURE_ICONS = Array.from({ length: 13 }, (_, index) => `/landing/decor-${String(index + 5).padStart(2, '0')}.png`);

export function LandingFeatures() {
    const t = useTranslations('LandingPage.features');
    const labels = t.raw('items') as string[];

    return (
        <section className="swx-intro" id="experience">
            <div className="swx-eyebrow">{t('eyebrow')}</div>
            <h2>{t('heading')}</h2>
            <div className="sw-feature-block">
                <div aria-label={t('label')} className="sw-feature-strip">
                    <div className="sw-feature-track" role="list" tabIndex={0}>
                        {labels.map((label, index) => (
                            <LandingFeatureItem iconPath={FEATURE_ICONS[index]} key={label} label={label} />
                        ))}
                        {labels.map((label, index) => (
                            <LandingFeatureItem clone iconPath={FEATURE_ICONS[index]} key={`clone-${label}`} label={label} />
                        ))}
                    </div>
                    <button aria-label={t('previous')} className="sw-feature-mobile-arrow sw-feature-mobile-arrow-left" type="button" />
                    <button aria-label={t('next')} className="sw-feature-mobile-arrow sw-feature-mobile-arrow-right" type="button" />
                </div>
            </div>
        </section>
    );
}
