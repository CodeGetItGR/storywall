'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { useLocalizedEventTypeName } from '@/hooks/useLocalizedEventTypeName';
import type { EventTypeConvention, PlatformEventTypeResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const EVENT_TYPE_VIBE: Record<EventTypeConvention, { emoji: string; badge: string; wash: string; ring: string }> = {
    WEDDING: { emoji: '💍', badge: 'bg-rose-100', wash: 'from-rose-50 to-white', ring: 'border-rose-300 bg-rose-50/70' },
    BAPTISM: { emoji: '🕊️', badge: 'bg-sky-100', wash: 'from-sky-50 to-white', ring: 'border-sky-300 bg-sky-50/70' },
    SOCIAL_EVENT: { emoji: '🎉', badge: 'bg-amber-100', wash: 'from-amber-50 to-white', ring: 'border-amber-300 bg-amber-50/70' },
    BIRTHDAY: { emoji: '🎂', badge: 'bg-pink-100', wash: 'from-pink-50 to-white', ring: 'border-pink-300 bg-pink-50/70' },
    CORPORATE: { emoji: '💼', badge: 'bg-slate-100', wash: 'from-slate-50 to-white', ring: 'border-slate-300 bg-slate-50/70' },
    FESTIVAL: { emoji: '🎪', badge: 'bg-violet-100', wash: 'from-violet-50 to-white', ring: 'border-violet-300 bg-violet-50/70' },
    PRIVATE_PARTY: { emoji: '🥳', badge: 'bg-fuchsia-100', wash: 'from-fuchsia-50 to-white', ring: 'border-fuchsia-300 bg-fuchsia-50/70' },
    CONFERENCE: { emoji: '🎤', badge: 'bg-indigo-100', wash: 'from-indigo-50 to-white', ring: 'border-indigo-300 bg-indigo-50/70' },
};

const FALLBACK_VIBE = { emoji: '✨', badge: 'bg-surface-muted', wash: 'from-surface-muted to-white', ring: 'border-primary bg-primary-light/50' };

type EventTypeStepProps = {
    eventTypes: PlatformEventTypeResponseDto[];
    selectedEventType: EventTypeConvention;
    onSelect: (eventType: EventTypeConvention) => void;
};

export function EventTypeStep({ eventTypes, selectedEventType, onSelect }: EventTypeStepProps) {
    const t = useTranslations('CreateEventPage');
    const tEventTypes = useTranslations('EventTypes');
    const localizedEventTypeName = useLocalizedEventTypeName();

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const eventTypeKey = event.currentTarget.dataset.eventTypeKey as EventTypeConvention | undefined;
        if (eventTypeKey) onSelect(eventTypeKey);
    }

    if (eventTypes.length === 0) {
        return <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{t('noEventTypes')}</p>;
    }

    return (
        <div className="flex min-h-[60vh] flex-col justify-center">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {eventTypes.map((type) => {
                    const vibe = EVENT_TYPE_VIBE[type.eventTypeKey] ?? FALLBACK_VIBE;
                    const isSelected = type.eventTypeKey === selectedEventType;
                    const tagline = tEventTypes.has(`${type.eventTypeKey}.tagline`) ? tEventTypes(`${type.eventTypeKey}.tagline`) : type.description;

                    return (
                        <button
                            key={type.id}
                            type="button"
                            data-event-type-key={type.eventTypeKey}
                            onClick={handleClick}
                            aria-pressed={isSelected}
                            className={cn(
                                'relative flex flex-col items-center gap-3 rounded-2xl border bg-gradient-to-b p-5 text-center transition hover:-translate-y-0.5 hover:shadow-md',
                                isSelected ? cn('border-2 shadow-sm', vibe.ring) : cn('border-border', vibe.wash)
                            )}
                        >
                            {isSelected && (
                                <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                                    <Check className="h-3.5 w-3.5" />
                                </span>
                            )}
                            <span className={cn('flex h-16 w-16 items-center justify-center rounded-full text-4xl shadow-sm', vibe.badge)}>
                                {vibe.emoji}
                            </span>
                            <span className="text-base font-bold text-ink">{localizedEventTypeName(type)}</span>
                            {tagline && <span className="text-xs leading-snug text-ink-muted">{tagline}</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
