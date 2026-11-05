import { getTranslations } from 'next-intl/server';

import { INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';
import { ALWAYS_ART } from '@/components/vendorPages/art/alwaysArt';
import { ALWAYS_RENDERS } from '@/components/vendorPages/renders/alwaysRenders';
import { VendorFeatureList } from '@/components/vendorPages/VendorFeatureList';
import { BAND, TOOLS_BAND } from '@/components/vendorPages/vendorPageStyles';
import { VendorSectionHead } from '@/components/vendorPages/VendorSectionHead';
import type { VendorPageType } from '@/i18n/publicLocale';
import { VENDOR_ALWAYS } from '@/lib/vendorPages';

export async function VendorPageAlways({ type }: { type: VendorPageType }) {
    const t = await getTranslations('VendorPages');

    return (
        /* Every event */
        <section className={`${SECTION} pt-0! min-[761px]:pt-0!`}>
            <div className={`${INNER} ${BAND} ${TOOLS_BAND}`}>
                <VendorSectionHead centered eyebrow={t('sections.always.eyebrow')} grad={t('sections.always.grad')} plain={t('sections.always.plain')} />
                <VendorFeatureList
                    features={VENDOR_ALWAYS.map((key) => {
                        const Render = ALWAYS_RENDERS[key];
                        return {
                            key,
                            art: ALWAYS_ART[key],
                            title: t(`always.${key}.title`),
                            body: t(`always.${key}.body`),
                            render: <Render type={type} />,
                        };
                    })}
                />
            </div>
        </section>
    );
}
