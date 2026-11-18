'use client';

import { useLocale, useTranslations } from 'next-intl';
import type React from 'react';
import { useMemo, useState } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useSettingsPartSave } from '@/hooks/useSettingsPartSave';
import type { EventDetailResponseDto, EventPatchDto } from '@/lib/api/types';
import {
    formatDate,
    getCurrentDatetimeLocalValue,
    getScheduleDatetimeLocalBounds,
    isDatetimeLocalAfter,
    isDatetimeLocalBefore,
    toDatetimeLocalValue,
} from '@/lib/datetime';
import { getLatestStartAt } from '@/lib/eventCoverage';
import { getEventEndPresets } from '@/lib/eventEndPresets';

// The date editor: today's start and end fields, their bounds, end presets, hints and checks.
export function useSettingsScheduleForm({ event, onSaved }: { event: EventDetailResponseDto; onSaved: () => void }) {
    const t = useTranslations('ManagePage');
    const tCreateEvent = useTranslations('CreateEventPage');
    const locale = useLocale();
    const { data: appConfig } = useAppConfig();
    const initialStartAt = toDatetimeLocalValue(event.schedule.startAt);
    const initialEndAt = toDatetimeLocalValue(event.schedule.endAt);
    const [startAt, setStartAt] = useState(initialStartAt);
    const [endAt, setEndAt] = useState(initialEndAt);
    const { save, isSaving, errorMessage } = useSettingsPartSave(event.id, onSaved);

    const nowAt = getCurrentDatetimeLocalValue();
    const eventHasStarted = Boolean(event.schedule.startAt && isDatetimeLocalBefore(initialStartAt, nowAt));
    // Coverage runs from payment, so the start must leave some of it after the event: the pinned end
    // once live, the server's projection while DRAFT.
    const latestStartAt = getLatestStartAt(
        event.schedule.coverageEndsAt ?? event.schedule.projectedCoverage?.coverageEndsAt,
        appConfig?.coverage.minDaysAfterStart,
    );
    const { startAtMin, startAtMax, endAtMin } = getScheduleDatetimeLocalBounds({ startAt, endAt, latestStartAt });
    const endAtPresets = useMemo(() => getEventEndPresets(event.eventType, startAt), [event.eventType, startAt]);
    // Order matters: startAtMax is the earlier of the end date and the coverage cap,
    // so a start past the end must be reported as that, not as "too far ahead".
    const scheduleError =
        !eventHasStarted && startAt && isDatetimeLocalBefore(startAt, startAtMin)
            ? t('settings.validation.startInPast')
            : startAt && endAt && !isDatetimeLocalAfter(endAt, startAt)
              ? t('settings.validation.endBeforeStart')
              : !eventHasStarted && startAt && latestStartAt && isDatetimeLocalAfter(startAt, startAtMax)
                ? t('settings.validation.startTooFarAhead', { date: formatDate(locale, latestStartAt, { dateStyle: 'medium' }) })
                : null;

    // The coverage window is pinned at activation, so moving a live event's start does not move it.
    // Said inline the moment the host changes the date. While DRAFT the server projects the window.
    const coverageKeptUntil = event.schedule.coverageEndsAt ? formatDate(locale, event.schedule.coverageEndsAt, { dateStyle: 'long' }) : null;
    const projection = event.schedule.projectedCoverage;
    const startHint = eventHasStarted
        ? t('settings.startLocked')
        : coverageKeptUntil && startAt !== initialStartAt
          ? t('settings.coverageFixed', { date: coverageKeptUntil })
          : projection
            ? tCreateEvent('coverageProjection', { endsAt: formatDate(locale, projection.coverageEndsAt, { dateStyle: 'medium' }) })
            : tCreateEvent('startAtHint');

    const patch: EventPatchDto = {};
    if (!eventHasStarted && startAt && startAt !== initialStartAt) patch.startAt = new Date(startAt).toISOString();
    if (endAt && endAt !== initialEndAt) patch.endAt = new Date(endAt).toISOString();

    function handleStartAtChange(value: string) {
        setStartAt(value);
    }

    function handleEndAtChange(value: string) {
        setEndAt(value);
    }

    function handleEndAtPresetClick(e: React.MouseEvent<HTMLButtonElement>) {
        const value = e.currentTarget.dataset.value;
        if (value) setEndAt(value);
    }

    function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (scheduleError || !startAt || !endAt) return;
        void save(patch);
    }

    return {
        startAt,
        endAt,
        startAtMin,
        startAtMax,
        endAtMin,
        endAtPresets,
        eventHasStarted,
        startHint,
        scheduleError,
        handleStartAtChange,
        handleEndAtChange,
        handleEndAtPresetClick,
        handleSubmit,
        isSaving,
        errorMessage,
        canSave: Boolean(startAt && endAt) && !scheduleError && Object.keys(patch).length > 0,
    };
}
