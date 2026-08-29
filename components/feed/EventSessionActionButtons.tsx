'use client';

import { Church, Martini } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { EventDetailResponseDto } from '@/lib/api/types';

type EventSessionActionButtonsProps = {
    event: Pick<EventDetailResponseDto, 'eventType' | 'sessions'>;
};

const SESSION_ACTION_EVENT_TYPES = new Set(['WEDDING', 'BAPTISM']);
const sessionButtonClassName =
    'inline-flex h-11 w-11 items-center justify-center rounded-full bg-background/92 text-ink shadow-[0_8px_22px_rgba(36,31,26,0.18)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export function EventSessionActionButtons({ event }: EventSessionActionButtonsProps) {
    const t = useTranslations('FeedPage');

    if (!SESSION_ACTION_EVENT_TYPES.has(event.eventType)) return null;

    const mainSession = event.sessions.find((session) => session.isMain);
    const secondarySession = event.sessions.find((session) => session.isSecondary);

    return (
        <>
            {/* Session actions */}
            <div className={'flex flex-col gap-4'}>
                {mainSession && (
                    <button type="button" aria-label={t('mainSession')} title={t('mainSession')} className={sessionButtonClassName}>
                        <Church className="h-5 w-5" aria-hidden="true" />
                    </button>
                )}
                {secondarySession && (
                    <button type="button" aria-label={t('secondarySession')} title={t('secondarySession')} className={sessionButtonClassName}>
                        <Martini className="h-5 w-5" aria-hidden="true" />
                    </button>
                )}
            </div>
        </>
    );
}
