import { getTranslations } from 'next-intl/server';

import { H2, INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';
import { LandingFaqItem } from '@/components/landing/LandingFaqItem';
import type { VendorPageType } from '@/i18n/publicLocale';

type FaqItem = [question: string, answer: string];

// The FAQ text, shared with the FAQPage JSON-LD so both always match.
export async function vendorPageFaqItems(type: VendorPageType): Promise<FaqItem[]> {
    const t = await getTranslations('VendorPages');
    return t.raw(`types.${type}.faq`) as FaqItem[];
}

export async function VendorPageFaq({ type }: { type: VendorPageType }) {
    const t = await getTranslations('VendorPages');
    const items = await vendorPageFaqItems(type);

    return (
        /* FAQ */
        <section className={`${SECTION} pt-0! min-[761px]:pt-0!`} id="faq">
            <div className={INNER}>
                <h2 className={`${H2} mb-7`}>{t('sections.faq')}</h2>
                <div className="border-t border-[rgb(21_19_19/26%)]">
                    {items.map(([question, answer], index) => (
                        <LandingFaqItem answer={answer} group="vendor-faq" index={index} key={question} question={question} />
                    ))}
                </div>
            </div>
        </section>
    );
}
