'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { useLocalizedEventTypeName } from '@/hooks/useLocalizedEventTypeName';
import type { EventTypeConvention, PlatformEventTypeResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const EVENT_TYPE_VIBE: Record<EventTypeConvention, { emoji: string; badge: string }> = {
    WEDDING: { emoji: '💍', badge: 'bg-rose-100' },
    BAPTISM: { emoji: '🕊️', badge: 'bg-sky-100' },
    SOCIAL_EVENT: { emoji: '🎉', badge: 'bg-amber-100' },
    BIRTHDAY: { emoji: '🎂', badge: 'bg-pink-100' },
    CORPORATE: { emoji: '💼', badge: 'bg-slate-100' },
    FESTIVAL: { emoji: '🎪', badge: 'bg-violet-100' },
    PRIVATE_PARTY: { emoji: '🥳', badge: 'bg-fuchsia-100' },
    CONFERENCE: { emoji: '🎤', badge: 'bg-indigo-100' },
};

const FALLBACK_VIBE = { emoji: '✨', badge: 'bg-surface-muted' };

type EventTypeStepProps = {
    eventTypes: PlatformEventTypeResponseDto[];
    selectedEventType: EventTypeConvention;
    onSelect: (eventType: EventTypeConvention) => void;
};

export function EventTypeStep({ eventTypes, selectedEventType, onSelect }: EventTypeStepProps) {
    const t = useTranslations('CreateEventPage');
    const localizedEventTypeName = useLocalizedEventTypeName();

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const eventTypeKey = event.currentTarget.dataset.eventTypeKey as EventTypeConvention | undefined;
        if (eventTypeKey) onSelect(eventTypeKey);
    }

    if (eventTypes.length === 0) {
        return <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{t('noEventTypes')}</p>;
    }

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {eventTypes.map((type) => {
                const vibe = EVENT_TYPE_VIBE[type.eventTypeKey] ?? FALLBACK_VIBE;
                const isSelected = type.eventTypeKey === selectedEventType;

                return (
                    <button
                        key={type.id}
                        type="button"
                        data-event-type-key={type.eventTypeKey}
                        onClick={handleClick}
                        aria-pressed={isSelected}
                        className={cn(
                            'flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition hover:border-primary/40 hover:bg-primary-light/30',
                            isSelected ? 'border-primary bg-primary-light/50' : 'border-border bg-white'
                        )}
                    >
                        <span className={cn('flex h-14 w-14 items-center justify-center rounded-full text-3xl', vibe.badge)}>
                            {vibe.emoji}
                        </span>
                        <span className="text-sm font-semibold text-ink">{localizedEventTypeName(type)}</span>
                        {type.description && <span className="text-xs text-ink-muted">{type.description}</span>}
                    </button>
                );
            })}
        </div>
    );
}
