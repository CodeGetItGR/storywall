'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { EventsGrid } from '@/components/events/EventsGrid';
import { EventsLoadingState } from '@/components/events/EventsLoadingState';
import { useEventGridItems } from '@/hooks/useEventGridItems';
import { useMyEventList } from '@/hooks/useMyEventList';
import { routes } from '@/lib/routes';

export default function EventsPage() {
    const t = useTranslations('EventsPage');
    const router = useRouter();
    const { eventQueries, isLoading, memberships } = useMyEventList();
    const items = useEventGridItems(memberships, eventQueries);

    useEffect(() => {
        if (!isLoading && memberships.length === 0) router.replace(routes.home);
    }, [isLoading, memberships.length, router]);

    if (!isLoading && memberships.length === 0) return null;

    return (
        <div className="mx-auto max-w-2xl px-4 pt-6 pb-24 lg:pb-8">
            <div className="mb-6 flex items-center justify-between gap-3">
                <h1 className="text-xl font-bold text-ink">{t('yourEvents')}</h1>
                <Link
                    href={routes.events.new}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                    {t('createEventCta')}
                </Link>
            </div>

            {isLoading ? <EventsLoadingState /> : <EventsGrid items={items} />}
        </div>
    );
}
