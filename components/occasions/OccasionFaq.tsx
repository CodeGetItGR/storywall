import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';

export type OccasionFaqItem = { q: string; a: string };

// Native <details>, so the answers are in the HTML.
export async function OccasionFaq({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const items = t.raw('faq') as OccasionFaqItem[];

    return (
        <section className="px-5 py-12 min-[761px]:px-[5vw] min-[761px]:py-20">
            <h2 className="m-0 [font-family:var(--editorial)] text-[clamp(30px,8vw,40px)] font-normal tracking-[-0.04em] min-[761px]:text-[56px]">
                {common('faqHeading')}
            </h2>
            <div className="mt-6 max-w-200 divide-y divide-black/10">
                {items.map((item) => (
                    <details className="group py-4" key={item.q}>
                        <summary className="cursor-pointer list-none text-base font-bold">{item.q}</summary>
                        <p className="mt-2 mb-0 text-[15px] leading-[1.55]">{item.a}</p>
                    </details>
                ))}
            </div>
        </section>
    );
}
