'use client';

import { Ban, CirclePause } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { EventStatePill } from '@/components/admin/events/EventStatePill';
import { useAdminEventTypeLabel } from '@/hooks/useAdminEventTypeLabel';
import { adminEventDetailState } from '@/lib/adminEvents';
import { formatAdminDate } from '@/lib/adminOrders';
import type { AdminEventDetailDto } from '@/lib/api/types';

const SECONDARY_BUTTON =
    'inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink';
const DANGER_BUTTON =
    'inline-flex min-h-9 items-center gap-2 rounded-md border border-status-danger/30 px-3 text-sm font-semibold text-status-danger transition-colors hover:bg-status-danger-wash';

// What the event is, at a glance: its name and state with the two restrictions beside them,
// then its type, when it happens and how long it is paid for.
export function EventSummaryHeader({
    event,
    editable,
    onSuspendAction,
    onCloseAction,
}: {
    event: AdminEventDetailDto;
    editable: boolean;
    onSuspendAction: () => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.events');
    const locale = useLocale();
    const eventTypeLabel = useAdminEventTypeLabel();
    const suspended = Boolean(event.suspension);
    const dateOrNotSet = (value: string | null) => (value ? formatAdminDate(locale, value) : t('detail.notSet'));

    return (
        <header className="rounded-xl border border-border bg-card p-5">
            {/* Name, state and restrictions */}
            <div className="flex flex-wrap items-center gap-3">
                <h1 className="min-w-0 truncate text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{event.title ?? t('untitled')}</h1>
                <EventStatePill state={adminEventDetailState(event)} />
                {editable && (
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        {!suspended && (
                            <button type="button" onClick={onSuspendAction} className={SECONDARY_BUTTON}>
                                <CirclePause className="h-4 w-4" aria-hidden />
                                {t('detail.suspend')}
                            </button>
                        )}
                        <button type="button" onClick={onCloseAction} className={DANGER_BUTTON}>
                            <Ban className="h-4 w-4" aria-hidden />
                            {t('detail.close')}
                        </button>
                    </div>
                )}
            </div>

            {/* Key facts */}
            <dl className="mt-4 grid gap-x-8 gap-y-3 border-t border-border pt-4 sm:grid-cols-3">
                <div className="min-w-0">
                    <dt className="text-xs text-ink-muted">{t('detail.type')}</dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{eventTypeLabel(event.eventType)}</dd>
                </div>
                <div className="min-w-0">
                    <dt className="text-xs text-ink-muted">{t('detail.when')}</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-ink">
                        {event.startAt && event.endAt && event.startAt.slice(0, 10) !== event.endAt.slice(0, 10)
                            ? `${formatAdminDate(locale, event.startAt)} → ${formatAdminDate(locale, event.endAt)}`
                            : dateOrNotSet(event.startAt)}
                    </dd>
                </div>
                <div className="min-w-0">
                    <dt className="text-xs text-ink-muted">{t('detail.coverageEnds')}</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-ink">{dateOrNotSet(event.coverageEndsAt)}</dd>
                </div>
            </dl>
        </header>
    );
}
