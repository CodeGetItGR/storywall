import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';

// One line and a link: pricing lives on the homepage only.
export async function OccasionPlans({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'OccasionPages.common.plans' });

    return (
        <section className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-[var(--occasion-tint)] px-5 py-8 min-[761px]:px-[5vw]">
            <p className="m-0 text-[15px]">{t('line')}</p>
            <a className="text-[15px] font-bold" href={`${getPublicLandingPath(locale)}#pricing`}>
                {t('link')}
            </a>
        </section>
    );
}
