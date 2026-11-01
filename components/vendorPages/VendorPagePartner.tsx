import { getTranslations } from 'next-intl/server';

import { INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';
import { VendorFeatureList } from '@/components/vendorPages/VendorFeatureList';
import { PARTNER_ICONS } from '@/components/vendorPages/vendorPageIcons';
import { BAND } from '@/components/vendorPages/vendorPageStyles';
import { VendorSectionHead } from '@/components/vendorPages/VendorSectionHead';
import type { VendorPageType } from '@/i18n/publicLocale';
import { VENDOR_PAGES } from '@/lib/vendorPages';

export async function VendorPagePartner({ type }: { type: VendorPageType }) {
    const t = await getTranslations('VendorPages');

    return (
        /* Partner program */
        <section className={`${SECTION} pt-0! min-[761px]:pt-0!`}>
            <div className={`${INNER} ${BAND} bg-[linear-gradient(125deg,#3b2529,#2e2328,#302523,#402a26)] text-white`}>
                <VendorSectionHead eyebrow={t('sections.partner.eyebrow')} grad={t('sections.partner.grad')} plain={t('sections.partner.plain')} />
                <VendorFeatureList
                    bodyClassName="text-white/75"
                    features={VENDOR_PAGES[type].partner.map((key) => ({
                        key,
                        icon: PARTNER_ICONS[key],
                        title: t(`partner.${key}.title`),
                        body: t(`partner.${key}.body`),
                    }))}
                />
            </div>
        </section>
    );
}
