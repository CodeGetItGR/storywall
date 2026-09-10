'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

const EXPLORE_HREFS = ['#platform', '#journey', '#experience', '#pricing', '#faq'];

export function LandingFooter() {
    const t = useTranslations('LandingPage.footer');
    const exploreLinks = t.raw('exploreLinks') as string[];
    const eventLinks = t.raw('eventLinks') as string[];
    const socialLinks = t.raw('socialLinks') as string[];
    const legalLinks = t.raw('legal') as string[];

    return (
        <footer className="sw-footer">
            <div className="sw-footer-top">
                <div className="sw-footer-brand">
                    <div className="sw-footer-logo">
                        <Image alt={t('imageAlt')} src="/landing/storywall-2.png" width={600} height={119} unoptimized />
                    </div>
                    <p>
                        {t('lineOne')}
                        <br />
                        {t('lineTwo')}
                    </p>
                </div>
                <div className="sw-footer-col">
                    <div className="sw-footer-label">{t('explore')}</div>
                    {exploreLinks.map((label, index) => (
                        <a href={EXPLORE_HREFS[index]} key={label}>
                            {label}
                        </a>
                    ))}
                </div>
                <div className="sw-footer-col">
                    <div className="sw-footer-label">{t('events')}</div>
                    {eventLinks.map((label) => (
                        <a href="#" key={label}>
                            {label}
                        </a>
                    ))}
                </div>
                <div className="sw-footer-col">
                    <div className="sw-footer-label">{t('social')}</div>
                    {socialLinks.map((label) => (
                        <a href="#" key={label}>
                            {label} ↗
                        </a>
                    ))}
                </div>
            </div>
            <div className="sw-footer-wordmark">STORYWALL</div>
            <div className="sw-footer-bottom">
                <span>{t('copyright')}</span>
                <div className="sw-footer-legal">
                    {legalLinks.map((label) => (
                        <a href="#" key={label}>
                            {label}
                        </a>
                    ))}
                </div>
                <a className="sw-footer-toplink" href="#platformStories">
                    {t('backToTop')} ↑
                </a>
            </div>
        </footer>
    );
}
