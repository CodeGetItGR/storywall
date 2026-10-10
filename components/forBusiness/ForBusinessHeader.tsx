import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';

export async function ForBusinessHeader() {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('ForBusinessPage.header');

    return (
        <header className="flex h-18 items-center justify-between gap-4 px-5 min-[761px]:h-22 min-[761px]:px-[clamp(24px,7vw,120px)]">
            {/* Logo */}
            <Link href={getPublicLandingPath(locale)} aria-label={t('home')} className="w-36 min-[761px]:w-44">
                <ProtectedImage unoptimized priority alt="" src="/landing/storywall.webp" width={600} height={119} className="block h-auto w-full" />
            </Link>
            {/* Actions */}
            <div className="flex items-center gap-3">
                <LanguageSwitcher />
                <a
                    href="#apply"
                    className="hidden min-h-10 items-center rounded-full bg-[#151313] px-4 text-sm font-semibold text-white no-underline min-[761px]:inline-flex"
                >
                    {t('apply')}
                </a>
            </div>
        </header>
    );
}
