import { getTranslations } from 'next-intl/server';

import { INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';
import { ALWAYS_ART } from '@/components/vendorPages/art/alwaysArt';
import { VendorFeatureList } from '@/components/vendorPages/VendorFeatureList';
import { BAND, TOOLS_BAND } from '@/components/vendorPages/vendorPageStyles';
import { VendorSectionHead } from '@/components/vendorPages/VendorSectionHead';
import { cn } from '@/lib/utils';
import { VENDOR_ALWAYS } from '@/lib/vendorPages';

// banded: in the tools spot, for a type with no tools of its own.
export async function VendorPageAlways({ banded = false }: { banded?: boolean }) {
    const t = await getTranslations('VendorPages');

    return (
        /* Every event */
        <section className={cn(SECTION, banded && 'pt-0! min-[761px]:pt-0!')}>
            <div className={cn(INNER, banded && `${BAND} ${TOOLS_BAND}`)}>
                <VendorSectionHead eyebrow={t('sections.always.eyebrow')} grad={t('sections.always.grad')} plain={t('sections.always.plain')} />
                <VendorFeatureList
                    features={VENDOR_ALWAYS.map((key) => ({
                        key,
                        art: ALWAYS_ART[key],
                        title: t(`always.${key}.title`),
                        body: t(`always.${key}.body`),
                    }))}
                />
            </div>
        </section>
    );
}
