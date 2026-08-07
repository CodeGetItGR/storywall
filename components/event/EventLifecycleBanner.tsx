'use client';

import { AlertTriangle, Clock3, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { EventStatus } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useActiveEvent, useIsHost } from '@/providers/EventProvider';

function tone(status: Exclude<EventStatus, 'ACTIVE'>) {
    if (status === 'DRAFT') return 'border-sky-200 bg-sky-50 text-sky-900';
    if (status === 'FROZEN') return 'border-amber-200 bg-amber-50 text-amber-950';
    return 'border-rose-200 bg-rose-50 text-rose-950';
}

function Icon({ status }: { status: Exclude<EventStatus, 'ACTIVE'> }) {
    if (status === 'DRAFT') return <Clock3 className="h-4 w-4" aria-hidden="true" />;
    if (status === 'FROZEN') return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
    return <XCircle className="h-4 w-4" aria-hidden="true" />;
}

export function EventLifecycleBanner() {
    const t = useTranslations('EventLifecycleBanner');
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const status = activeEvent?.status;

    if (!activeEvent || !status || status === 'ACTIVE') return null;

    const actionHref = status === 'DRAFT' ? routes.manage : routes.events.settingsPlan(activeEvent.id);
    const showAction = isHost;

    return (
        <div className="px-3 pt-3 sm:px-4">
            <div className={cn('mx-auto flex max-w-5xl flex-col gap-3 rounded-lg border px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-4', tone(status))}>
                <div className="flex min-w-0 gap-2">
                    <span className="mt-0.5 shrink-0">
                        <Icon status={status} />
                    </span>
                    <div className="min-w-0">
                        <p className="font-semibold">{t(`${status}.title`)}</p>
                        <p className="mt-0.5 text-xs leading-relaxed opacity-80">{t(`${status}.${isHost ? 'hostBody' : 'guestBody'}`)}</p>
                    </div>
                </div>
                {showAction && (
                    <Link
                        href={actionHref}
                        className="inline-flex min-h-10 w-full shrink-0 items-center justify-center rounded-full bg-background/80 px-3 py-2 text-xs font-semibold text-ink ring-1 ring-black/5 sm:w-auto"
                    >
                        {t(`${status}.action`)}
                    </Link>
                )}
            </div>
        </div>
    );
}
