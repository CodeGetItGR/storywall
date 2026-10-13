import { getTranslations } from 'next-intl/server';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { OccasionCtaLink } from '@/components/occasions/OccasionCtaLink';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { routes } from '@/lib/routes';

type OccasionHeaderProps = { alternatePaths: Record<Locale, string>; createHref: string; locale: Locale };

export async function OccasionHeader({ alternatePaths, createHref, locale }: OccasionHeaderProps) {
    const t = await getTranslations({ locale, namespace: 'OccasionPages.common.nav' });

    return (
        <header className="flex items-center justify-between gap-4 px-5 py-4 min-[761px]:px-[5vw] min-[761px]:py-6">
            {/* Brand */}
            <a aria-label={t('home')} href={getPublicLandingPath(locale)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG wordmark */}
                <img alt="" className="h-6 w-auto min-[761px]:h-7" height={28} src="/assets/LogoText.svg" width={140} />
            </a>
            {/* Actions */}
            <nav className="flex items-center gap-4 text-sm font-bold">
                <LanguageSwitcher alternatePaths={alternatePaths} className="hidden min-[761px]:inline-flex" />
                <a className="inline-flex min-h-11 items-center" href={routes.login}>
                    {t('signIn')}
                </a>
                {/* Create (desktop): on phones the hero button sits right below */}
                <OccasionCtaLink className="hidden min-[761px]:inline-flex" href={createHref} size="sm">
                    {t('create')}
                </OccasionCtaLink>
            </nav>
        </header>
    );
}
