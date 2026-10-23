import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';

import { BODY, H2, INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';
import type { Locale } from '@/i18n/config';
import { occasionsFor } from '@/lib/forBusinessOccasions';

export async function ForBusinessClients() {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('ForBusinessPage');
    const steps = t.raw('clients.steps') as string[];

    return (
        /* What clients get */
        <section className={`${SECTION} bg-[#f4f0e8]`}>
            <div className={INNER}>
                <h2 className={H2}>{t('clients.heading')}</h2>
                <ol className="mt-8 grid list-none gap-4 p-0 min-[761px]:grid-cols-3 min-[761px]:gap-8">
                    {steps.map((step, index) => (
                        <li key={step} className={BODY}>
                            <span className="mb-2 block [font-family:var(--editorial)] text-2xl text-[#d87d8f]">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            {step}
                        </li>
                    ))}
                </ol>
                <p className={`mt-6 ${BODY}`}>{t('clients.disposable')}</p>
                {/* Occasions */}
                <div className="mt-10 grid gap-6 min-[761px]:grid-cols-2">
                    {occasionsFor(locale).map((occasion) => (
                        <figure key={occasion.eventTypeKey} className="m-0">
                            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                                <Image
                                    src={occasion.imageSrc}
                                    alt={t(`occasions.${occasion.eventTypeKey}.alt`)}
                                    fill
                                    sizes="(min-width: 761px) 50vw, 100vw"
                                    className="object-cover"
                                />
                            </div>
                            <figcaption className="mt-3">
                                <span className="block [font-family:var(--editorial)] text-2xl">{t(`occasions.${occasion.eventTypeKey}.name`)}</span>
                                <span className={BODY}>{t(`occasions.${occasion.eventTypeKey}.line`)}</span>
                            </figcaption>
                        </figure>
                    ))}
                </div>
            </div>
        </section>
    );
}
