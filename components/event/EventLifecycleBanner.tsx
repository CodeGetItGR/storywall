'use client';

import { Clock3 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { routes } from '@/lib/routes';
import { useActiveEvent, useIsHost, useRouteEventId } from '@/providers/EventProvider';

export function EventLifecycleBanner() {
    const t = useTranslations('EventLifecycleBanner');
    const pathname = usePathname();
    const activeEvent = useActiveEvent();
    // Id-less routes (/post/[id]) fall back to the last visited event, which the page is not about.
    const routeEventId = useRouteEventId();
    const isHost = useIsHost();
    const status = activeEvent?.status;

    if (!routeEventId || !activeEvent || !status || status === 'ACTIVE') return null;
    if (pathname.startsWith(`/events/${activeEvent.id}/checkout/`)) return null;

    const actionHref = routes.events.manage(activeEvent.id);
    // The manage page already surfaces this status via its badge and overview panel.
    if (pathname === actionHref) return null;

    const showAction = isHost;

    return (
        <div className="px-3 pt-3 sm:px-4">
            <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <div className="flex min-w-0 gap-2">
                    <span className="mt-0.5 shrink-0">
                        <Clock3 className="h-4 w-4" aria-hidden="true" />
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
