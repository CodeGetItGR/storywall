import { getTranslations } from 'next-intl/server';

import { KeywordHero } from '@/components/landing/KeywordHero';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHeroActions } from '@/components/landing/LandingHeroActions';
import { OccasionHeroVisual } from '@/components/occasions/OccasionHeroVisual';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath, QR_WEDDING_PATHS } from '@/i18n/publicLocale';
import { OCCASION_SECTION_IDS } from '@/lib/occasions/occasionSections';
import { QR_WEDDING_CREATE_HREF, QR_WEDDING_GUIDE_ID } from '@/lib/qrWeddingPage';

// The only place the page says the QR code is included in every plan.
export async function QrWeddingHero({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage' });
    const landing = await getTranslations({ locale, namespace: 'LandingPage' });
    const nav = landing.raw('hero.nav') as string[];
    const mobileNav = landing.raw('hero.mobileNav') as string[];
    const links = [
        { href: `#${OCCASION_SECTION_IDS.howItWorks}`, label: nav[1]!, mobileLabel: mobileNav[1]! },
        { href: `#${QR_WEDDING_GUIDE_ID}`, label: t('nav.guide'), mobileLabel: t('nav.guideMobile') },
        { href: `#${OCCASION_SECTION_IDS.pricing}`, label: nav[3]!, mobileLabel: mobileNav[3]! },
        { href: `#${OCCASION_SECTION_IDS.faq}`, label: landing('faq.eyebrow'), mobileLabel: landing('faq.eyebrow') },
    ];

    return (
        <KeywordHero
            actions={
                <LandingHeroActions
                    main={{ href: QR_WEDDING_CREATE_HREF, arrow: '↗', click: { event: 'create', placement: 'hero' } }}
                    mainLabel={t('hero.cta')}
                />
            }
            h1={t('hero.h1')}
            header={
                <LandingHeader
                    alternatePaths={QR_WEDDING_PATHS}
                    homeHref={getPublicLandingPath(locale)}
                    links={links}
                    loginLabel={nav.at(-1)!}
                    mobileLoginLabel={mobileNav.at(-1)!}
                />
            }
            headline={t.rich('hero.headline', { b: (chunks) => <strong className="font-bold">{chunks}</strong> })}
            lead={t('hero.lead')}
            note={t('hero.included')}
            visual={<OccasionHeroVisual />}
        />
    );
}
