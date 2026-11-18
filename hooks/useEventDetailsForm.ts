'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { ERROR_CODES, getErrorCode, getFieldErrors } from '@/lib/api/errors';
import { formatDate, getScheduleDatetimeLocalBounds, isDatetimeLocalAfter, isDatetimeLocalBefore, toDatetimeLocalValue } from '@/lib/datetime';
import { getLatestStartAt } from '@/lib/eventCoverage';
import {
    emptyEventDetailsValues,
    eventDetailsRequest,
    type EventDetailsValues,
    readEventDetailsValues,
    rememberEventDetailsValues,
} from '@/lib/eventDetailsForm';
import { getSupportedTimezones } from '@/lib/timezones';

type ServerErrors = { startAt?: string; timezone?: string; locationName?: string; locationAddress?: string };

/**
 * The date and place of an event that has none yet. `earliestStartAt` is the instant whose day the date can go back
 * to (a past date is allowed on an upgrade); without one, the date can't be in the past. `coverageEndsAt` is the
 * coverage the event will have; the date must leave the configured days after it. The values are remembered in the
 * tab under `storageKey`, so a reload or an abandoned checkout doesn't lose them.
 */
export function useEventDetailsForm({
    storageKey,
    earliestStartAt = null,
    coverageEndsAt,
}: {
    storageKey: string;
    earliestStartAt?: string | null;
    coverageEndsAt: string | null | undefined;
}) {
    const t = useTranslations('CreateEventPage');
    const locale = useLocale();
    const toErrorMessage = useApiErrorMessage();
    const { data: appConfig } = useAppConfig();
    const [values, setValues] = useState<EventDetailsValues>(() => readEventDetailsValues(storageKey) ?? emptyEventDetailsValues());
    const [serverErrors, setServerErrors] = useState<ServerErrors>({});

    useEffect(() => rememberEventDetailsValues(storageKey, values), [storageKey, values]);

    const change = useCallback((field: keyof EventDetailsValues, value: string) => {
        setValues((current) => ({ ...current, [field]: value }));
        setServerErrors((current) => ({ ...current, [field]: undefined }));
    }, []);
    const onStartAtChange = useCallback((value: string) => change('startAt', value), [change]);
    const onTimezoneChange = useCallback((event: ChangeEvent<HTMLInputElement>) => change('timezone', event.target.value), [change]);
    const onLocationNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => change('locationName', event.target.value), [change]);
    const onLocationAddressChange = useCallback((event: ChangeEvent<HTMLInputElement>) => change('locationAddress', event.target.value), [change]);
    const onMapsUrlChange = useCallback((event: ChangeEvent<HTMLInputElement>) => change('mapsUrl', event.target.value), [change]);

    const timezoneOptions = useMemo(() => getSupportedTimezones(), []);
    const isTimezoneValid = timezoneOptions.includes(values.timezone);
    const latestStartAt = getLatestStartAt(coverageEndsAt, appConfig?.coverage.minDaysAfterStart);
    const bounds = getScheduleDatetimeLocalBounds({ startAt: values.startAt, latestStartAt });
    const earliestDay = earliestStartAt ? toDatetimeLocalValue(earliestStartAt).slice(0, 10) : '';
    const startAtMin = earliestDay ? `${earliestDay}T00:00` : bounds.startAtMin;
    const startAtMax = bounds.startAtMax;

    const startBeforeLabel = earliestStartAt ? formatDate(locale, earliestStartAt, { dateStyle: 'medium' }) : '';
    const startBeforePayment = t('validation.startBeforePayment', { date: startBeforeLabel });
    const localScheduleError =
        values.startAt && isDatetimeLocalBefore(values.startAt, startAtMin)
            ? earliestStartAt
                ? startBeforePayment
                : t('validation.startInPast')
            : values.startAt && latestStartAt && isDatetimeLocalAfter(values.startAt, startAtMax)
              ? t('validation.startTooFarAhead', { date: formatDate(locale, latestStartAt, { dateStyle: 'medium' }) })
              : null;
    const scheduleError = localScheduleError ?? serverErrors.startAt ?? null;
    const timezoneError = serverErrors.timezone ?? (values.timezone && !isTimezoneValid ? t('validation.invalidTimezone') : null);

    const isComplete = Boolean(
        values.startAt && isTimezoneValid && !scheduleError && !timezoneError && values.locationName.trim() && values.locationAddress.trim(),
    );

    // Puts what the server refused on its field. False when the error isn't about these details.
    const applyServerError = useCallback(
        (error: unknown): boolean => {
            const code = getErrorCode(error);
            if (code === ERROR_CODES.EVENT_START_BEFORE_PURCHASE) {
                setServerErrors({ startAt: startBeforePayment });
                return true;
            }
            if (code === ERROR_CODES.EVENT_START_TOO_FAR_AHEAD || code === ERROR_CODES.EVENT_DATES_INCOMPLETE) {
                setServerErrors({ startAt: toErrorMessage(error) });
                return true;
            }
            const fields = getFieldErrors(error) ?? {};
            const field = (name: keyof ServerErrors) => fields[`details.${name}`] ?? fields[name];
            const next: ServerErrors = {
                startAt: field('startAt'),
                timezone: field('timezone'),
                locationName: field('locationName'),
                locationAddress: field('locationAddress'),
            };
            if (!Object.values(next).some(Boolean)) return false;
            setServerErrors(next);
            return true;
        },
        [startBeforePayment, toErrorMessage],
    );

    return {
        ...values,
        startAtMin,
        startAtMax,
        scheduleError,
        onStartAtChange,
        timezoneOptions,
        timezoneError,
        onTimezoneChange,
        locationNameError: serverErrors.locationName,
        onLocationNameChange,
        locationAddressError: serverErrors.locationAddress,
        onLocationAddressChange,
        onMapsUrlChange,
        isComplete,
        request: eventDetailsRequest(values),
        applyServerError,
    };
}

export type EventDetailsForm = ReturnType<typeof useEventDetailsForm>;
