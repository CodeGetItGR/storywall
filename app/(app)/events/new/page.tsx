'use client';

import { ArrowLeft, ChevronDown, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { useCreateEvent } from '@/hooks/useEvent';
import { getErrorMessage, getFieldErrors } from '@/lib/api/errors';
import type { EventRequestDto, EventTypeConvention } from '@/lib/api/types';
import { useEventSwitcher } from '@/providers/EventProvider';

const EVENT_TYPES: EventTypeConvention[] = ['WEDDING', 'BAPTISM', 'BIRTHDAY', 'CONFERENCE'];

export default function CreateEventPage() {
    const t = useTranslations('CreateEventPage');
    const router = useRouter();
    const { setActiveEventId } = useEventSwitcher();
    const createEvent = useCreateEvent();

    const [title, setTitle] = useState('');
    const [eventType, setEventType] = useState<EventTypeConvention>('WEDDING');
    const [startAt, setStartAt] = useState('');
    const [endAt, setEndAt] = useState('');
    const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [locationName, setLocationName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const fieldErrors = getFieldErrors(createEvent.error);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        if (!title.trim() || !startAt) return;

        const input: EventRequestDto = {
            title: title.trim(),
            eventType,
            visibility: 'PRIVATE',
            startAt: new Date(startAt).toISOString(),
            endAt: endAt ? new Date(endAt).toISOString() : undefined,
            timezone,
            locationName: locationName.trim() || undefined,
            brandingSettings: {},
            isArchived: false,
        };

        try {
            const event = await createEvent.mutateAsync(input);
            setActiveEventId(event.id);
            router.push('/manage');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }

    return (
        <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
            <div className="flex items-center gap-3 py-4 mb-2">
                <button
                    onClick={() => router.back()}
                    aria-label={t('goBack')}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-base font-bold text-ink">{t('title')}</h1>
            </div>

            <div className="bg-card rounded-xl shadow-2xs p-5">
                <p className="text-sm text-ink-muted mb-5">{t('subtitle')}</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('fields.title')}</span>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('placeholders.title')}
                            className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
                        />
                        {fieldErrors?.title && <span className="text-xs text-rose-500">{fieldErrors.title}</span>}
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('fields.eventType')}</span>
                        <div className="relative">
                            <select
                                value={eventType}
                                onChange={(e) => setEventType(e.target.value as EventTypeConvention)}
                                className="w-full appearance-none bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition pr-10"
                            >
                                {EVENT_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {t(`eventTypes.${type}`)}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                        </div>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('fields.startAt')}</span>
                            <input
                                type="datetime-local"
                                required
                                value={startAt}
                                onChange={(e) => setStartAt(e.target.value)}
                                className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('fields.endAt')}</span>
                            <input
                                type="datetime-local"
                                value={endAt}
                                onChange={(e) => setEndAt(e.target.value)}
                                className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                            />
                        </label>
                    </div>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('fields.timezone')}</span>
                        <input
                            type="text"
                            required
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                        />
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('fields.locationName')}</span>
                        <input
                            type="text"
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                            placeholder={t('placeholders.locationName')}
                            className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
                        />
                    </label>

                    {error && <p className="text-xs text-rose-500 text-center">{error}</p>}

                    <button
                        type="submit"
                        disabled={createEvent.isPending || !title.trim() || !startAt}
                        className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {createEvent.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('submit')}
                    </button>
                </form>
            </div>
        </div>
    );
}
