import { getLocale, getTranslations } from 'next-intl/server';

import { ForBusinessApplyForm } from '@/components/forBusiness/ForBusinessApplyForm';
import { H2, INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';
import type { Locale } from '@/i18n/config';
import { countryOptions, defaultCountryCode } from '@/lib/forBusinessApplication';

export async function ForBusinessApply() {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('ForBusinessPage.apply');

    return (
        /* Apply */
        <section className={SECTION} id="apply">
            <div className={`${INNER} max-w-160`}>
                <h2 className={H2}>{t('heading')}</h2>
                <ForBusinessApplyForm countries={countryOptions(locale)} defaultCountry={defaultCountryCode(locale)} />
            </div>
        </section>
    );
}
