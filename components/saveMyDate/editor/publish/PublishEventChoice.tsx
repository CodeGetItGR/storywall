'use client';

import { CalendarHeart, ChevronRight, Loader2, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { LoadingState } from '@/components/ui/LoadingState';
import type { InvitationEventChoice } from '@/hooks/useInvitationEventChoice';
import { formatDate } from '@/lib/datetime';

type PublishEventChoiceProps = {
    choice: InvitationEventChoice;
    onNew: () => void;
};

const ROW_CLASS =
    'flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60';

// The host's events the invitation can go on, and a new event made from it.
export function PublishEventChoice({ choice, onNew }: PublishEventChoiceProps) {
    const t = useTranslations('InvitationEditor');
    const locale = useLocale();
    const isChoosing = choice.choosingId !== null;

    function handleChoose(event: MouseEvent<HTMLButtonElement>) {
        const { eventId } = event.currentTarget.dataset;
        if (eventId) choice.choose(eventId);
    }

    return (
        <div className="flex flex-col gap-3">
            {/* Title */}
            <h2 className="pr-10 text-base font-semibold">{t('chooseEvent')}</h2>

            {/* Events */}
            {choice.isLoading ? (
                <LoadingState className="py-6" />
            ) : (
                <ul className="-mx-3 flex flex-col">
                    {choice.events.map((event) => (
                        <li key={event.id}>
                            <button type="button" data-event-id={event.id} onClick={handleChoose} disabled={isChoosing} className={ROW_CLASS}>
                                <CalendarHeart className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-medium text-ink">{event.title}</span>
                                    <span className="block text-ink-muted">
                                        {formatDate(locale, event.schedule.startAt, { dateStyle: 'medium' })}
                                    </span>
                                </span>
                                {choice.choosingId === event.id ? (
                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-muted" aria-hidden="true" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                                )}
                            </button>
                        </li>
                    ))}

                    {/* New event */}
                    <li>
                        <button type="button" onClick={onNew} disabled={isChoosing} className={ROW_CLASS}>
                            <Plus className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
                            <span className="min-w-0 flex-1 font-medium text-ink">{t('newEvent')}</span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                        </button>
                    </li>
                </ul>
            )}

            {/* Failure */}
            {choice.error && (
                <p role="alert" className="font-medium text-rose-700">
                    {choice.error}
                </p>
            )}
        </div>
    );
}
