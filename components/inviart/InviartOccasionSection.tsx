import { getTranslations } from 'next-intl/server';

import { InviartCardList } from '@/components/inviart/InviartCardList';
import type { Locale } from '@/i18n/config';
import type { EventTypeConvention } from '@/lib/api/types';
import { loadInviartCards } from '@/lib/inviart.server';

// INVIART's cards on an occasion page, just above the FAQ. Hidden when there is nothing to show.
export async function InviartOccasionSection({ eventType, locale }: { eventType: EventTypeConvention; locale: Locale }) {
    const cards = await loadInviartCards(eventType);
    if (!cards) return null;
    const t = await getTranslations({ locale, namespace: 'Inviart' });

    return (
        /* INVIART */
        <section className="px-5 py-12 font-[Arial,Helvetica,sans-serif] text-[#151313] min-[761px]:px-[clamp(24px,7vw,120px)] min-[761px]:py-16">
            <div className="mx-auto w-full max-w-295">
                {/* Heading */}
                <h2 className="mt-0 mb-6 [font-family:var(--editorial)] text-[44px] leading-[0.9] font-normal tracking-[-0.05em] min-[761px]:mb-8 min-[761px]:text-[clamp(44px,4.5vw,64px)]">
                    {t('heading')}
                </h2>
                {/* Cards */}
                <InviartCardList
                    cards={cards}
                    eventType={eventType}
                    locale={locale}
                    ctaLabel={t('cta')}
                    wasLabel={t('was')}
                    className="-mx-5 scroll-px-5 px-5 sm:mx-0 sm:px-0"
                />
            </div>
        </section>
    );
}
