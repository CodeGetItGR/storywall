'use client';

import { Check } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import type { AppEventTypeResponseDto, EventTypeAccentToken, EventTypeConvention } from '@/lib/api/types';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { cn } from '@/lib/utils';

// accentToken is a BE-owned design token (see event-type-voice-pack-fe-integration.md);
// this is the only place that maps it to actual Tailwind classes.
const ACCENT_TOKEN_STYLES: Record<
    EventTypeAccentToken,
    {
        selected: string;
        surface: string;
    }
> = {
    rose: {
        selected: 'border-rose-300 bg-rose-50/55 shadow-[0_18px_45px_rgba(244,63,94,0.16)]',
        surface: 'hover:border-rose-200 hover:bg-rose-50/35',
    },
    sky: {
        selected: 'border-sky-300 bg-sky-50/55 shadow-[0_18px_45px_rgba(14,165,233,0.16)]',
        surface: 'hover:border-sky-200 hover:bg-sky-50/35',
    },
    amber: {
        selected: 'border-amber-300 bg-amber-50/55 shadow-[0_18px_45px_rgba(245,158,11,0.16)]',
        surface: 'hover:border-amber-200 hover:bg-amber-50/35',
    },
};

const FALLBACK_STYLE = {
    selected: 'border-primary bg-primary-light/45 shadow-[0_18px_45px_rgba(15,23,42,0.12)]',
    surface: 'hover:border-primary/30 hover:bg-primary-light/25',
};

type EventTypeStepProps = {
    eventTypes: AppEventTypeResponseDto[];
    selectedEventType: EventTypeConvention;
    onSelectAction: (eventType: EventTypeConvention) => void;
};

export function EventTypeStep({ eventTypes, selectedEventType, onSelectAction }: EventTypeStepProps) {
    const t = useTranslations('CreateEventPage');
    const eventTypeCopy = useLocalizedAppEventTypeCopy();

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const eventTypeKey = event.currentTarget.dataset.eventTypeKey as EventTypeConvention | undefined;
        if (eventTypeKey) onSelectAction(eventTypeKey);
    }

    if (eventTypes.length === 0) {
        return <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{t('noEventTypes')}</p>;
    }

    return (
        <div className="flex min-h-[60vh] flex-col justify-center">
            {/* Event Types */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {eventTypes.map((type) => {
                    const style = ACCENT_TOKEN_STYLES[type.accentToken] ?? FALLBACK_STYLE;
                    const isSelected = type.eventTypeKey === selectedEventType;
                    const copy = eventTypeCopy(type.eventTypeKey);
                    const backgroundImageSrc = getCreateEventCatalogEntry(type.eventTypeKey)?.backgroundImageSrc;

                    return (
                        <button
                            key={type.id}
                            type="button"
                            data-event-type-key={type.eventTypeKey}
                            onClick={handleClick}
                            aria-pressed={isSelected}
                            className={cn(
                                'group relative min-h-44 overflow-hidden rounded-lg border bg-card p-5 text-left transition duration-200 hover:-translate-y-0.5',
                                backgroundImageSrc && 'flex flex-col justify-end text-white',
                                isSelected ? cn('border-2', style.selected) : cn('border-border shadow-sm', !backgroundImageSrc && style.surface)
                            )}
                        >
                            {backgroundImageSrc && (
                                <>
                                    <Image
                                        src={backgroundImageSrc}
                                        alt=""
                                        fill
                                        sizes="(min-width: 640px) 320px, 100vw"
                                        className="object-cover transition duration-300 group-hover:scale-105"
                                    />
                                    <span className="absolute inset-0 bg-black/10" />
                                    <span className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/88 via-black/60 to-transparent backdrop-blur-[1px]" />
                                </>
                            )}
                            {isSelected && (
                                <span className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white shadow-sm">
                                    <Check className="h-4 w-4" />
                                </span>
                            )}
                            <span className={cn('relative z-10 block pr-8 text-xl font-bold', backgroundImageSrc ? 'text-white' : 'mt-5 text-ink')}>
                                {copy.name}
                            </span>
                            {copy.tagline && (
                                <span
                                    className={cn(
                                        'relative z-10 mt-1.5 block max-w-64 text-sm leading-5',
                                        backgroundImageSrc ? 'text-white/86' : 'text-ink-muted'
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
