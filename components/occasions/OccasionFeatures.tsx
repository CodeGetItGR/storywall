import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';

export async function OccasionFeatures({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.features` });

    return (
        <section className="px-5 py-12 min-[761px]:px-[5vw] min-[761px]:py-20">
            <h2 className="m-0 [font-family:var(--editorial)] text-[clamp(30px,8vw,40px)] font-normal tracking-[-0.04em] min-[761px]:text-[56px]">
                {common('featuresHeading')}
            </h2>
            <div className="mt-8 grid gap-x-12 gap-y-8 min-[761px]:grid-cols-2">
                {occasion.features.map((key) => (
                    <div key={key}>
                        <h3 className="m-0 text-lg font-bold">{t(`${key}.title`)}</h3>
                        <p className="mt-2 text-[15px] leading-[1.55] text-[var(--ink)]">{t(`${key}.body`)}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
