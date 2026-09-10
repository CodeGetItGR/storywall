'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

export function LandingDemo() {
    const t = useTranslations('LandingPage.demo');
    const heading = t.raw('heading') as string[];

    return (
        <section className="swdemo-cta" id="demo">
            <div className="swdemo-kicker">{t('eyebrow')}</div>
            <div className="swdemo-main">
                <h2>
                    {heading[0]}
                    <br />
                    <strong>{heading[1]}</strong>
                </h2>
                <div className="swdemo-bottom">
                    <p>
                        {t('copyStart')} <strong>{t('copyDemo')}</strong> {t('copyMiddle')} <strong>{t('copyBrand')}</strong>
                        <br />
                        {t('copyEnd')}
                    </p>
                    <a aria-label={t('cta')} className="swdemo-button" href="#">
                        <span>{t('button')}</span>
                        <span className="swdemo-arrow">↗</span>
                    </a>
                </div>
            </div>
            <div aria-label={t('previewLabel')} className="swdemo-device-wrap">
                <Image
                    alt={t('imageAlt')}
                    className="swdemo-demo-image"
                    data-original-src="/landing/storywall-demo-preview-with-two-angled-smartphones-showing-the-a.webp"
                    src="/landing/storywall-demo-preview-with-two-angled-smartphones-showing-the-a.webp"
                    width={1115}
                    height={1120}
                    unoptimized
                />
            </div>
            <a aria-label={t('cta')} className="swdemo-button swdemo-mobile-button" href="#">
                <span>{t('button')}</span>
                <span className="swdemo-arrow">↗</span>
            </a>
        </section>
    );
}
