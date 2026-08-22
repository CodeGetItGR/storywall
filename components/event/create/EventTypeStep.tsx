'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { useLocalizedEventTypeName } from '@/hooks/useLocalizedEventTypeName';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { EventTypeAccentToken, EventTypeConvention, PlatformEventTypeResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// accentToken is a BE-owned design token (see event-type-voice-pack-fe-integration.md);
// this is the only place that maps it to actual Tailwind classes.
const ACCENT_TOKEN_STYLES: Record<EventTypeAccentToken, { badge: string; wash: string; ring: string }> = {
    rose: { badge: 'bg-rose-100', wash: 'from-rose-50 to-white', ring: 'border-rose-300 bg-rose-50/70' },
    sky: { badge: 'bg-sky-100', wash: 'from-sky-50 to-white', ring: 'border-sky-300 bg-sky-50/70' },
    amber: { badge: 'bg-amber-100', wash: 'from-amber-50 to-white', ring: 'border-amber-300 bg-amber-50/70' },
};

const FALLBACK_STYLE = { badge: 'bg-surface-muted', wash: 'from-surface-muted to-white', ring: 'border-primary bg-primary-light/50' };

type EventTypeStepProps = {
    eventTypes: PlatformEventTypeResponseDto[];
    selectedEventType: EventTypeConvention;
    onSelect: (eventType: EventTypeConvention) => void;
};

export function EventTypeStep({ eventTypes, selectedEventType, onSelect }: EventTypeStepProps) {
    const t = useTranslations('CreateEventPage');
    const localizedEventTypeName = useLocalizedEventTypeName();
    const localizedText = useLocalizedText();

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
                    const style = ACCENT_TOKEN_STYLES[type.accentToken] ?? FALLBACK_STYLE;
                    const isSelected = type.eventTypeKey === selectedEventType;
                    const tagline = localizedText(type.tagline);

                    return (
                        <button
                            key={type.id}
                            type="button"
                            data-event-type-key={type.eventTypeKey}
                            onClick={handleClick}
                            aria-pressed={isSelected}
                            className={cn(
                                'relative flex flex-col items-center gap-3 rounded-2xl border bg-gradient-to-b p-5 text-center transition hover:-translate-y-0.5 hover:shadow-md',
                                isSelected ? cn('border-2 shadow-sm', style.ring) : cn('border-border', style.wash)
                            )}
                        >
                            {isSelected && (
                                <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                                    <Check className="h-3.5 w-3.5" />
                                </span>
                            )}
                            <span className={cn('flex h-16 w-16 items-center justify-center rounded-full text-4xl shadow-sm', style.badge)}>
                                {type.icon || '✨'}
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
