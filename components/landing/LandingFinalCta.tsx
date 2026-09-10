'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

export function LandingFinalCta() {
    const t = useTranslations('LandingPage.finalCta');
    const heading = t.raw('heading') as string[];

    return (
        <section className="sw-final-cta" id="create">
            <div className="sw-final-cta-media">
                <Image
                    alt={t('imageAlt')}
                    data-filename="storywall-final-cta-wedding-santorini.webp"
                    src="/landing/storywall-final-cta-wedding-santorini.webp"
                    width={1448}
                    height={1086}
                    unoptimized
                />
            </div>
            <div className="sw-final-cta-content">
                <div aria-hidden="true" className="sw-final-cta-mark">
                    <svg className="sw-final-cta-sparkle" role="presentation" viewBox="0 0 64 64">
                        <path d="M32 3C34.7 19.2 44.8 29.3 61 32C44.8 34.7 34.7 44.8 32 61C29.3 44.8 19.2 34.7 3 32C19.2 29.3 29.3 19.2 32 3Z" />
                        <path
                            className="sw-final-cta-sparkle-small"
                            d="M51 5C52.1 11.7 56.3 15.9 63 17C56.3 18.1 52.1 22.3 51 29C49.9 22.3 45.7 18.1 39 17C45.7 15.9 49.9 11.7 51 5Z"
                        />
                    </svg>
                </div>
                <div className="sw-final-cta-kicker">{t('eyebrow')}</div>
                <h2>
                    {heading[0]}
                    <br />
                    <strong>{heading[1]}</strong>
                </h2>
                <p>
                    {t('copyStart')} <strong>{t('copyStrong')}</strong>
                </p>
                <a className="sw-final-cta-btn" href="#">
                    <span>{t('cta')}</span>
                    <span>↗</span>
                </a>
            </div>
        </section>
    );
}
