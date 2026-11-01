import { getTranslations } from 'next-intl/server';

import { INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';
import { VendorFeatureList } from '@/components/vendorPages/VendorFeatureList';
import { TOOL_ICONS } from '@/components/vendorPages/vendorPageIcons';
import { BAND } from '@/components/vendorPages/vendorPageStyles';
import { VendorSectionHead } from '@/components/vendorPages/VendorSectionHead';
import type { VendorPageType } from '@/i18n/publicLocale';
import { VENDOR_PAGES } from '@/lib/vendorPages';

export async function VendorPageTools({ type }: { type: VendorPageType }) {
    const t = await getTranslations('VendorPages');
    const tools = VENDOR_PAGES[type].tools;
    if (tools.length === 0) return null;

    return (
        /* Tools */
        <section className={`${SECTION} pt-0! min-[761px]:pt-0!`}>
            <div className={`${INNER} ${BAND} bg-[linear-gradient(135deg,#fbedf1,#fcefea,#fdf1e8,#fef5e9)]`}>
                <VendorSectionHead eyebrow={t('sections.tools.eyebrow')} grad={t('sections.tools.grad')} plain={t('sections.tools.plain')} />
                <VendorFeatureList
                    features={tools.map((key) => ({ key, icon: TOOL_ICONS[key], title: t(`tools.${key}.title`), body: t(`tools.${key}.body`) }))}
                />
            </div>
        </section>
    );
}
