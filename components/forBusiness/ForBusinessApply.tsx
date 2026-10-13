import { getLocale, getTranslations } from 'next-intl/server';

import { ForBusinessApplyForm } from '@/components/forBusiness/ForBusinessApplyForm';
import { H2, SECTION } from '@/components/forBusiness/forBusinessStyles';
import type { Locale } from '@/i18n/config';
import { countryOptions, defaultCountryCode } from '@/lib/forBusinessApplication';

export async function ForBusinessApply() {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('ForBusinessPage.apply');

    return (
        /* Apply */
        <section className={SECTION} id="apply">
            {/* A narrower column than other sections, so the form fields stay short. */}
            <div className="mx-auto w-full max-w-160">
                <h2 className={H2}>{t('heading')}</h2>
                <ForBusinessApplyForm countries={countryOptions(locale)} defaultCountry={defaultCountryCode(locale)} />
            </div>
        </section>
    );
}
