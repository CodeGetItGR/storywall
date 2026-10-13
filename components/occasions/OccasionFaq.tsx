import { ChevronDown } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { OccasionSectionHeading } from '@/components/occasions/OccasionSectionHeading';
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
            {/* Heading */}
            <OccasionSectionHeading>{common('faqHeading')}</OccasionSectionHeading>

            {/* Questions */}
            <div className="mt-8 max-w-200 divide-y divide-[var(--occasion-line)] border-y border-[var(--occasion-line)]">
                {items.map((item) => (
                    <details className="group py-5" key={item.q}>
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-bold [&::-webkit-details-marker]:hidden">
                            {item.q}
                            <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-[#d43a62] transition group-open:rotate-180" />
                        </summary>
                        <p className="mt-3 mb-0 text-[15px] leading-[1.6] text-[#3d3836]">{item.a}</p>
                    </details>
                ))}
            </div>
        </section>
    );
}
