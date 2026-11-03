'use client';

import { useLocale, useTranslations } from 'next-intl';

import { InviartCardList } from '@/components/inviart/InviartCardList';
import { useInviartCards } from '@/hooks/useInviartCards';
import type { Locale } from '@/i18n/config';
import type { EventTypeConvention } from '@/lib/api/types';

// INVIART's cards at the bottom of the event Overview. Nothing shows while loading, on an error,
// or when the event's type has no collection.
export function InviartOverviewSection({ eventType }: { eventType: EventTypeConvention }) {
    const t = useTranslations('Inviart');
    const locale = useLocale() as Locale;
    const cards = useInviartCards(eventType);
    if (cards.length === 0) return null;

    return (
        <section className="border-t border-border pt-4">
            {/* Heading */}
            <h2 className="mb-3 text-base font-semibold text-foreground">{t('heading')}</h2>
            {/* Cards */}
            <InviartCardList
                cards={cards}
                eventType={eventType}
                locale={locale}
                ctaLabel={t('cta')}
                wasLabel={t('was')}
                className="sm:grid-cols-2 lg:grid-cols-3"
            />
        </section>
    );
}
