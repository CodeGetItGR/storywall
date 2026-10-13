import { getTranslations } from 'next-intl/server';

import { OccasionSectionHeading } from '@/components/occasions/OccasionSectionHeading';
import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';

type Step = { title: string; body: string };

export async function OccasionHowItWorks({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const steps = t.raw('howItWorks') as Step[];

    return (
        <section className="bg-[var(--occasion-tint)] px-5 py-12 min-[761px]:px-[5vw] min-[761px]:py-20">
            {/* Heading */}
            <OccasionSectionHeading>{common('howItWorksHeading')}</OccasionSectionHeading>

            {/* Steps */}
            <ol className="mt-8 grid list-none gap-8 p-0 min-[761px]:mt-10 min-[761px]:grid-cols-3 min-[761px]:gap-12">
                {steps.map((step, index) => (
                    <li key={step.title}>
                        <span aria-hidden="true" className="occasion-label [font-family:var(--editorial)] text-5xl leading-none font-bold">
                            {index + 1}
                        </span>
                        <h3 className="mt-3 mb-0 text-lg font-bold">{step.title}</h3>
                        <p className="mt-2 mb-0 text-[15px] leading-[1.6] text-[#3d3836]">{step.body}</p>
                    </li>
                ))}
            </ol>
        </section>
    );
}
