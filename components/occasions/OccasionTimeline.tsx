import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';

type Step = { title: string; body: string };

export async function OccasionTimeline({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const steps = t.raw('timeline') as Step[];

    return (
        <section className="bg-[var(--occasion-tint)] px-5 py-12 min-[761px]:px-[5vw] min-[761px]:py-20">
            <h2 className="m-0 [font-family:var(--editorial)] text-[clamp(30px,8vw,40px)] font-normal tracking-[-0.04em] min-[761px]:text-[56px]">
                {common('timelineHeading')}
            </h2>
            <ol className="mt-8 grid list-none gap-8 p-0 min-[761px]:grid-cols-3">
                {steps.map((step) => (
                    <li key={step.title}>
                        <h3 className="m-0 text-sm font-black tracking-[0.12em] text-[var(--occasion-accent)] uppercase">{step.title}</h3>
                        <p className="mt-2 text-[15px] leading-[1.55]">{step.body}</p>
                    </li>
                ))}
            </ol>
        </section>
    );
}
