'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { SessionLocationIcon } from '@/components/session-location/SessionLocationIcon';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import { resolveSessionLocationIcon } from '@/lib/sessionLocations';

type EventSessionActionButtonsProps = {
    event: Pick<EventDetailResponseDto, 'eventType' | 'id' | 'sessions'>;
};

const sessionButtonClassName =
    'inline-flex h-11 w-11 items-center justify-center rounded-full bg-background/92 text-ink shadow-[0_8px_22px_rgba(36,31,26,0.18)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export function EventSessionActionButtons({ event }: EventSessionActionButtonsProps) {
    const t = useTranslations('FeedPage');

    const mainSession = event.sessions.find((session) => session.isMain);
    const secondarySession = event.sessions.find((session) => session.isSecondary);

    return (
        <>
            {/* Session actions */}
            <div className={'flex flex-col gap-4'}>
                {mainSession && (
                    <Link
                        href={routes.events.location(event.id, 'main')}
                        aria-label={t('mainSession')}
                        title={t('mainSession')}
                        className={sessionButtonClassName}
                    >
                        <SessionLocationIcon icon={resolveSessionLocationIcon(event.eventType, 'main')} size="sm" />
                    </Link>
                )}
                {secondarySession && (
                    <Link
                        href={routes.events.location(event.id, 'secondary')}
                        aria-label={t('secondarySession')}
                        title={t('secondarySession')}
                        className={sessionButtonClassName}
                    >
                        <SessionLocationIcon icon={resolveSessionLocationIcon(event.eventType, 'secondary')} size="sm" />
                    </Link>
                )}
            </div>
        </>
    );
}
