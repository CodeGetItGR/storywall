'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import type { BusinessEventDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { routes } from '@/lib/routes';

// One event the vendor worked: name, date, their type there and guests, with views for partners. Opens that event's vendor page while
// access lasts; once the host removed the vendor it stays in the list, marked "Access ended", without a link.
export function BusinessEventRow({ event }: { event: BusinessEventDto }) {
    const t = useTranslations('BusinessPage.events');
    const tVendors = useTranslations('Vendors');
    const locale = useLocale();
    const body = (
        <>
            {/* Name and details */}
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{event.title}</p>
                <p className="truncate text-xs text-ink-muted">
                    {formatDate(locale, event.startAt, { dateStyle: 'medium' })} · {tVendors(`types.${event.vendorType}`)} ·{' '}
                    {t('rowGuests', { count: event.guests })}
                    {!event.open && ` · ${t('ended')}`}
                </p>
            </div>

            {/* Views (partners) */}
            {event.views !== undefined && (
                <p className="shrink-0 text-sm font-semibold text-ink tabular-nums">{t('rowViews', { count: event.views })}</p>
            )}

            {/* Link marker */}
            {event.open && <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />}
        </>
    );

    return (
        <li>
            {event.open ? (
                <AppLink href={routes.events.tools.vendorMe(event.eventId)} className="flex min-h-14 items-center gap-3 py-3">
                    {body}
                </AppLink>
            ) : (
                <div className="flex min-h-14 items-center gap-3 py-3">{body}</div>
            )}
        </li>
    );
}
