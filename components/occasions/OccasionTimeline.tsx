import { getTranslations } from 'next-intl/server';

import { OccasionSectionHeading } from '@/components/occasions/OccasionSectionHeading';
import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';

type Step = { title: string; body: string };

export async function OccasionTimeline({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const steps = t.raw('timeline') as Step[];

    return (
        <section className="px-5 py-12 min-[761px]:px-[5vw] min-[761px]:py-20">
            {/* Heading */}
            <OccasionSectionHeading>{common('timelineHeading')}</OccasionSectionHeading>

            {/* Steps */}
            <ol className="mt-8 grid list-none gap-8 p-0 min-[761px]:mt-10 min-[761px]:grid-cols-3 min-[761px]:gap-12">
                {steps.map((step) => (
                    <li className="border-t border-[var(--occasion-line)] pt-5" key={step.title}>
                        <h3 className="occasion-label m-0 text-xs font-black tracking-[0.18em] uppercase min-[761px]:text-[13px]">{step.title}</h3>
                        <p className="mt-3 mb-0 text-[15px] leading-[1.6] text-[#3d3836]">{step.body}</p>
                    </li>
                ))}
            </ol>
        </section>
    );
}
