import { getTranslations } from 'next-intl/server';

import { INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';
import { VendorFeatureList } from '@/components/vendorPages/VendorFeatureList';
import { ALWAYS_ICONS } from '@/components/vendorPages/vendorPageIcons';
import { VendorSectionHead } from '@/components/vendorPages/VendorSectionHead';
import { VENDOR_ALWAYS } from '@/lib/vendorPages';

export async function VendorPageAlways() {
    const t = await getTranslations('VendorPages');

    return (
        /* Every event */
        <section className={SECTION}>
            <div className={INNER}>
                <VendorSectionHead eyebrow={t('sections.always.eyebrow')} grad={t('sections.always.grad')} plain={t('sections.always.plain')} />
                <VendorFeatureList
                    features={VENDOR_ALWAYS.map((key) => ({ key, icon: ALWAYS_ICONS[key], title: t(`always.${key}.title`), body: t(`always.${key}.body`) }))}
                />
            </div>
        </section>
    );
}
