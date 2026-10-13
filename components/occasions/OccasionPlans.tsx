import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';

// One line and a link: pricing lives on the homepage only.
export async function OccasionPlans({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'OccasionPages.common.plans' });

    return (
        <section className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 pt-10 min-[761px]:px-[5vw] min-[761px]:pt-14">
            <p className="m-0 text-[15px]">{t('line')}</p>
            <a className="text-[15px] font-bold text-[#c2334f] underline-offset-4 hover:underline" href={`${getPublicLandingPath(locale)}#pricing`}>
                {t('link')}
            </a>
        </section>
    );
}
