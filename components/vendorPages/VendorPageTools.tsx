import { getTranslations } from 'next-intl/server';

import { INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';
import { TOOL_ART } from '@/components/vendorPages/art/toolArt';
import { TOOL_RENDERS } from '@/components/vendorPages/renders/toolRenders';
import { VendorFeatureList } from '@/components/vendorPages/VendorFeatureList';
import { BAND, TOOLS_BAND } from '@/components/vendorPages/vendorPageStyles';
import { VendorSectionHead } from '@/components/vendorPages/VendorSectionHead';
import type { VendorPageType } from '@/i18n/publicLocale';
import { VENDOR_PAGES } from '@/lib/vendorPages';

export async function VendorPageTools({ type }: { type: VendorPageType }) {
    const t = await getTranslations('VendorPages');

    return (
        /* Tools */
        <section className={`${SECTION} pt-0! min-[761px]:pt-0!`}>
            <div className={`${INNER} ${BAND} ${TOOLS_BAND}`}>
                <VendorSectionHead centered eyebrow={t('sections.tools.eyebrow')} grad={t('sections.tools.grad')} plain={t('sections.tools.plain')} />
                <VendorFeatureList
                    features={VENDOR_PAGES[type].tools.map((key) => {
                        const Render = TOOL_RENDERS[key];
                        return {
                            key,
                            art: TOOL_ART[key],
                            title: t(`tools.${key}.title`),
                            body: t(`tools.${key}.body`),
                            render: <Render type={type} />,
                        };
                    })}
                />
            </div>
        </section>
    );
}
