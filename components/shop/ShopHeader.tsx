import { getTranslations } from 'next-intl/server';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AppLink } from '@/components/ui/AppLink';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';

// The partner page's header: logo and language. alternatePaths keeps the visitor on the same shop page.
export async function ShopHeader({ locale, alternatePaths }: { locale: Locale; alternatePaths: Record<Locale, string> }) {
    const t = await getTranslations({ locale, namespace: 'Shop' });
    const tAlt = await getTranslations({ locale, namespace: 'ImageAlt' });

    return (
        <header className="flex h-18 items-center justify-between gap-4 px-5 min-[761px]:h-22 min-[761px]:px-[clamp(24px,7vw,120px)]">
            {/* Logo */}
            <AppLink href={getPublicLandingPath(locale)} aria-label={t('home')} className="w-36 min-[761px]:w-44">
                <ProtectedImage unoptimized priority alt={tAlt('storywallLogo')} src="/landing/storywall.webp" width={600} height={119} className="block h-auto w-full" />
            </AppLink>
            {/* Language */}
            <LanguageSwitcher alternatePaths={alternatePaths} />
        </header>
    );
}
