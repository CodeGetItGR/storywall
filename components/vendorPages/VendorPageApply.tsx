import { getLocale, getTranslations } from 'next-intl/server';

import { ForBusinessApplyForm } from '@/components/forBusiness/ForBusinessApplyForm';
import { H2, SECTION } from '@/components/forBusiness/forBusinessStyles';
import type { Locale } from '@/i18n/config';
import type { VendorPageType } from '@/i18n/publicLocale';
import { countryOptions, defaultCountryCode } from '@/lib/forBusinessApplication';

// The partner application, with the page's vendor type already picked.
export async function VendorPageApply({ type }: { type: VendorPageType }) {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('VendorPages.sections');

    return (
        /* Apply */
        <section className={`${SECTION} pt-0! min-[761px]:pt-0!`} id="apply">
            {/* A narrower column than other sections, so the form fields stay short. */}
            <div className="mx-auto w-full max-w-160">
                <h2 className={H2}>{t('apply')}</h2>
                <ForBusinessApplyForm countries={countryOptions(locale)} defaultCountry={defaultCountryCode(locale)} defaults={{ role: type }} />
            </div>
        </section>
    );
}
