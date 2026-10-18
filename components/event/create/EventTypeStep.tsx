'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import type { EventTypeAccentToken, EventTypeConvention } from '@/lib/api/types';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { cn } from '@/lib/utils';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// accentToken is a BE-owned design token (see event-type-voice-pack-fe-integration.md);
// this is the only place that maps it to actual Tailwind classes.
const ACCENT_TOKEN_STYLES: Record<EventTypeAccentToken, string> = {
    rose: 'hover:border-rose-200 hover:bg-rose-50/35',
    sky: 'hover:border-sky-200 hover:bg-sky-50/35',
    amber: 'hover:border-amber-200 hover:bg-amber-50/35',
};

const FALLBACK_STYLE = 'hover:border-primary/30 hover:bg-primary-light/25';

export function EventTypeStep() {
    const t = useTranslations('CreateEventPage');
    const eventTypeCopy = useLocalizedAppEventTypeCopy();
    const { eventTypes, selectedEventType, onSelectEventType } = useCreateEventForm();

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const eventTypeKey = event.currentTarget.dataset.eventTypeKey as EventTypeConvention | undefined;
        if (eventTypeKey) onSelectEventType(eventTypeKey);
    }

    if (eventTypes.length === 0) {
        return <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{t('noEventTypes')}</p>;
    }

    return (
        <div className="flex min-h-[60vh] flex-col justify-center">
            {/* Event Types */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {eventTypes.map((type) => {
                    const surfaceStyle = ACCENT_TOKEN_STYLES[type.accentToken] ?? FALLBACK_STYLE;
                    const isSelected = type.eventTypeKey === selectedEventType;
                    const copy = eventTypeCopy(type.eventTypeKey);
                    // An admin-uploaded image wins over the built-in one.
                    const backgroundImageSrc = type.imageUrl ?? getCreateEventCatalogEntry(type.eventTypeKey)?.backgroundImageSrc;

                    return (
                        <button
                            key={type.id}
                            type="button"
                            data-event-type-key={type.eventTypeKey}
                            onClick={handleClick}
                            aria-pressed={isSelected}
                            className={cn(
                                'group relative flex min-h-56 flex-col justify-end overflow-hidden rounded-lg border border-border bg-card p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5',
                                backgroundImageSrc ? 'text-white' : surfaceStyle,
                                // The other types fade out, so the picked one stands on its own.
                                !isSelected &&
                                    'opacity-55 grayscale hover:opacity-100 hover:grayscale-0 focus-visible:opacity-100 focus-visible:grayscale-0',
                            )}
                        >
                            {/* Background */}
                            {backgroundImageSrc && (
                                <>
                                    <ProtectedImage
                                        src={backgroundImageSrc}
                                        alt=""
                                        fill
                                        sizes="(min-width: 640px) 320px, 100vw"
                                        className="object-cover transition duration-300 group-hover:scale-105"
                                    />
                                    <span className="absolute inset-0 bg-black/10" />
                                    <span className="absolute inset-x-0 bottom-0 h-3/4 bg-linear-to-t from-black/90 via-black/55 to-transparent" />
                                </>
                            )}
                            {isSelected && (
                                <span className="absolute top-4 right-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white shadow-sm">
                                    <Check className="h-4 w-4" />
                                </span>
                            )}
                            {/* Name */}
                            <span
                                className={cn(
                                    'relative z-10 block pr-8 text-xl font-bold',
                                    backgroundImageSrc ? 'text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]' : 'text-ink',
                                )}
                            >
                                {copy.name}
                            </span>
                            {copy.tagline && (
                                <span
                                    className={cn(
                                        'relative z-10 mt-1.5 block max-w-64 text-sm leading-5',
                                        backgroundImageSrc ? 'text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]' : 'text-ink-muted',
                                    )}
                                >
                                    {copy.tagline}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
