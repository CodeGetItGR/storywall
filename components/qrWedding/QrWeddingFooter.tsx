import { getTranslations } from 'next-intl/server';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { LandingNewsletter } from '@/components/landing/LandingNewsletter';
import type { Locale } from '@/i18n/config';
import { getForBusinessPath, getPublicLandingPath, getQrWeddingPath, localizeLegalHref } from '@/i18n/publicLocale';
import { loadLiveOccasions } from '@/lib/occasions/liveOccasions.server';
import { occasionPath } from '@/lib/occasions/occasions';
import { QR_WEDDING_MEDIA, QR_WEDDING_SECTION, qrWeddingParentPath } from '@/lib/qrWeddingPage';
import { routes } from '@/lib/routes';
import { SOCIAL_PROFILES } from '@/lib/seo';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';

const LABEL = 'mb-5.5 font-[Arial,sans-serif] text-[9px] font-black tracking-[0.16em] text-[rgba(255,255,255,.48)]';
const LINK =
    'py-1.5 font-[Arial,sans-serif] text-[13px] leading-[1.35] text-white transition-[opacity,transform] duration-250 ease-[ease] min-[1001px]:hover:translate-x-0.75 min-[1001px]:hover:opacity-62';

// The page's dark footer: brand and newsletter, link columns, the wordmark, and the legal row.
export async function QrWeddingFooter({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.footer' });
    const landing = await getTranslations({ locale, namespace: 'LandingPage.footer' });
    const pages = await getTranslations({ locale, namespace: 'OccasionPages' });
    const occasions = await loadLiveOccasions();
    const weddingPath = qrWeddingParentPath(locale);
    const legal = (href: string) => localizeLegalHref(href, locale);

    const exploreLinks = [
        { key: 'platform', href: getPublicLandingPath(locale) },
        { key: 'howItWorks', href: `#${QR_WEDDING_SECTION.howItWorks}` },
        { key: 'features', href: `#${QR_WEDDING_SECTION.features}` },
        ...(weddingPath ? [{ key: 'pricing', href: `${weddingPath}#${QR_WEDDING_SECTION.pricing}` }] : []),
        { key: 'faq', href: `#${QR_WEDDING_SECTION.faq}` },
    ];
    const legalLinks = [
        { label: landing('legalLinks.privacy'), href: legal(routes.legal.privacy()) },
        { label: landing('legalLinks.terms'), href: legal(routes.legal.terms()) },
        { label: landing('communityGuidelines'), href: legal(routes.legal.communityGuidelines()) },
        { label: landing('reportContent'), href: routes.reportContent },
        { label: landing('legalLinks.cookies'), href: legal(routes.legal.cookies()) },
        { label: landing('legalLinks.withdrawal'), href: legal(routes.legal.withdrawalTerms()) },
        { label: landing('legalLinks.contact'), href: routes.contact },
    ];

    return (
        <footer className="overflow-hidden bg-[#262626] px-[5vw] pt-18.5 pb-7 text-white max-[761px]:px-5 max-[761px]:pt-14.5 max-[761px]:pb-6">
            <div className="grid grid-cols-[1.65fr_.75fr_.75fr_.75fr] gap-[5vw] border-b border-[rgba(255,255,255,.14)] pb-19 max-[761px]:grid-cols-2 max-[761px]:gap-x-6.5 max-[761px]:gap-y-10.5 max-[761px]:pb-13.5">
                {/* Brand */}
                <div className="max-[761px]:col-span-full">
                    <div className="w-[clamp(179px,19.6vw,301px)] leading-none max-[761px]:w-[min(57.4vw,231px)]">
                        <ProtectedImage
                            alt={landing('imageAlt')}
                            className="block h-auto w-full object-contain"
                            height={119}
                            sizes="301px"
                            src={`${QR_WEDDING_MEDIA}/storywall-logo-light.webp`}
                            width={600}
                        />
                    </div>
                    <p className="mt-5 max-w-80 font-[Arial,sans-serif] text-sm leading-[1.55] text-[rgba(255,255,255,.68)] max-[761px]:mt-4 max-[761px]:text-[13px]">
                        {landing('lineOne')}
                        <br />
                        {landing('lineTwo')}
                    </p>
                    {/* Newsletter */}
                    <LandingNewsletter heading={landing('newsletter')} headingClassName={LABEL} />
                </div>

                {/* Explore */}
                <div className="flex flex-col items-start">
                    <div className={LABEL}>{t('explore')}</div>
                    {exploreLinks.map(({ key, href }) => (
                        <a className={LINK} href={href} key={key}>
                            {t(`links.${key}`)}
                        </a>
                    ))}
                    <a aria-current="page" className={LINK} href={getQrWeddingPath(locale)}>
                        {t('links.qrWedding')}
                    </a>
                    {showsUnreleasedPages() && (
                        <a className={LINK} href={getForBusinessPath(locale)}>
                            {t('links.forBusiness')}
                        </a>
                    )}
                </div>

                {/* Occasions */}
                {occasions.length > 0 && (
                    <div className="flex flex-col items-start">
                        <div className={LABEL}>{landing('occasions')}</div>
                        {occasions.map((occasion) => (
                            <a className={LINK} href={occasionPath(occasion, locale)} key={occasion.eventType}>
                                {pages(`${occasion.eventType}.name`)}
                            </a>
                        ))}
                    </div>
                )}

                {/* Social */}
                <div className="flex flex-col items-start">
                    <div className={LABEL}>{landing('social')}</div>
                    {SOCIAL_PROFILES.map(({ key, href }) => (
                        <a className={LINK} href={href} key={key} rel="noopener noreferrer" target="_blank">
                            {landing(`socialLinks.${key}`)} ↗
                        </a>
                    ))}
                </div>
            </div>

            {/* Wordmark */}
            <div
                aria-hidden="true"
                className="pt-12.5 pb-7.5 [font-family:var(--editorial)] text-[clamp(110px,17vw,310px)] leading-[.72] font-normal tracking-[-0.075em] whitespace-nowrap text-white max-[761px]:w-full max-[761px]:max-w-full max-[761px]:overflow-visible max-[761px]:pt-10.5 max-[761px]:pb-6.5 max-[761px]:text-[clamp(52px,16.5vw,70px)] max-[761px]:leading-[.82] max-[761px]:tracking-[-0.06em]"
            >
                STORYWALL
            </div>

            {/* Legal */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6.5 border-t border-[rgba(255,255,255,.16)] pt-5.5 font-[Arial,sans-serif] text-[9px] font-extrabold tracking-widest text-[rgba(255,255,255,.62)] max-[761px]:grid-cols-[1fr_auto] max-[761px]:gap-4">
                <span>{landing('copyright')}</span>
                <div className="flex flex-wrap justify-center gap-x-4.5 gap-y-2.5 text-white max-[761px]:col-span-full max-[761px]:row-start-2 max-[761px]:justify-start max-[761px]:gap-x-4 max-[761px]:gap-y-3">
                    {legalLinks.map(({ label, href }) => (
                        <a className="whitespace-nowrap text-white" href={href} key={href}>
                            {label}
                        </a>
                    ))}
                </div>
                <a className="justify-self-end text-white max-[761px]:col-start-2 max-[761px]:row-start-1" href={`#${QR_WEDDING_SECTION.top}`}>
                    {t('backToTop')} ↑
                </a>
            </div>
        </footer>
    );
}
