import { getTranslations } from 'next-intl/server';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { QR_WEDDING_MEDIA, QR_WEDDING_SECTION } from '@/lib/qrWeddingPage';
import { routes } from '@/lib/routes';

const NAV_LINKS = [
    { key: 'howItWorks', href: `#${QR_WEDDING_SECTION.howItWorks}` },
    { key: 'why', href: `#${QR_WEDDING_SECTION.why}` },
    { key: 'demo', href: `#${QR_WEDDING_SECTION.demo}` },
    { key: 'pricing', href: `#${QR_WEDDING_SECTION.pricing}` },
    { key: 'faq', href: `#${QR_WEDDING_SECTION.faq}` },
] as const;

// The logo and the in-page links over the hero. Below 861px only Log in stays.
export async function QrWeddingHeader({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.header' });

    return (
        <header className="absolute inset-x-0 top-0 z-30 h-22">
            <div className="mx-auto flex h-full w-[min(1220px,100%_-_64px)] items-center justify-between gap-8 max-[761px]:w-[calc(100%_-_40px)] max-[601px]:w-[calc(100%_-_36px)] max-[601px]:max-w-full">
                {/* Logo */}
                <a aria-label={t('homeLabel')} href={getPublicLandingPath(locale)}>
                    <ProtectedImage
                        priority
                        alt={t('logoAlt')}
                        className="block h-auto w-[clamp(142px,13vw,190px)]"
                        height={119}
                        sizes="190px"
                        src={`${QR_WEDDING_MEDIA}/storywall-logo.webp`}
                        width={600}
                    />
                </a>

                {/* Navigation */}
                <nav
                    aria-label={t('navLabel')}
                    className="flex gap-[clamp(24px,2.1vw,42px)] font-[Arial,Helvetica,sans-serif] text-sm leading-none tracking-[-0.015em] text-nowrap"
                >
                    {NAV_LINKS.map(({ key, href }) => (
                        <a className="uppercase max-[861px]:hidden" href={href} key={key}>
                            {t(key)}
                        </a>
                    ))}
                    <a className="font-bold uppercase" href={routes.login}>
                        {t('login')}
                    </a>
                </nav>
            </div>
        </header>
    );
}
