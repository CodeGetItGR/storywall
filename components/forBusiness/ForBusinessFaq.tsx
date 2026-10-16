import { getLocale, getTranslations } from 'next-intl/server';

import { H2, INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';
import { LandingFaqItem } from '@/components/landing/LandingFaqItem';
import type { Locale } from '@/i18n/config';
import { occasionsFor } from '@/lib/forBusinessOccasions';

type FaqItem = [question: string, answer: string];

// The FAQ text, shared with the FAQPage JSON-LD so both always match.
export async function forBusinessFaqItems(): Promise<FaqItem[]> {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('ForBusinessPage');
    const occasions = new Intl.ListFormat(locale, { type: 'conjunction' }).format(
        occasionsFor(locale).map((occasion) => t(`occasions.${occasion.eventTypeKey}.name`)),
    );
    return (t.raw('faq.items') as FaqItem[]).map(([question, answer]) => [question, answer.replace('{occasions}', occasions)]);
}

export async function ForBusinessFaq() {
    const t = await getTranslations('ForBusinessPage.faq');
    const items = await forBusinessFaqItems();

    return (
        /* FAQ */
        <section className={SECTION} id="faq">
            <div className={INNER}>
                <h2 className={`${H2} mb-7`}>{t('heading')}</h2>
                <div className="border-t border-[rgb(21_19_19/26%)]">
                    {items.map(([question, answer], index) => (
                        <LandingFaqItem answer={answer} index={index} key={question} question={question} />
                    ))}
                </div>
            </div>
        </section>
    );
}
