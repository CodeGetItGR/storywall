'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { useAdminPlanTiers, useAdminPlatformEventTypes } from '@/hooks/useAdmin';
import { useProvisionAdminEventMutation } from '@/hooks/useAdminAccounts';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { eligibleProvisioningPlans } from '@/lib/adminAccountProvisioning';
import { getFieldErrors } from '@/lib/api/errors';
import type { EventTypeConvention, EventVisibility, UserResponseDto } from '@/lib/api/types';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { datetimeLocalValueToIso, getScheduleDatetimeLocalBounds, isDatetimeLocalAfter, isDatetimeLocalBefore } from '@/lib/datetime';
import { getCurrentTimezone, getSupportedTimezones } from '@/lib/timezones';

export type ProvisionEventStep = 'event' | 'review' | 'success';

export function useProvisionEventForm(host: UserResponseDto) {
    const tCreate = useTranslations('CreateEventPage');
    const t = useTranslations('AdminPage.accounts.provision');
    const toErrorMessage = useApiErrorMessage();
    const eventTypesQuery = useAdminPlatformEventTypes();
    const plansQuery = useAdminPlanTiers('EVENT');
    const provisionEvent = useProvisionAdminEventMutation();

    const [step, setStep] = useState<ProvisionEventStep>('event');
    const [eventType, setEventType] = useState<EventTypeConvention | ''>('');
    const [planTierCode, setPlanTierCode] = useState('');
    const [title, setTitle] = useState('');
    const [startAt, setStartAt] = useState('');
    const [endAt, setEndAt] = useState('');
    const [timezone, setTimezone] = useState(getCurrentTimezone);
    const [locationName, setLocationName] = useState('');
    const [locationAddress, setLocationAddress] = useState('');
    const [mapsUrl, setMapsUrl] = useState('');
    const [visibility, setVisibility] = useState<EventVisibility>('PRIVATE');

    const eventTypes = useMemo(
        () => (eventTypesQuery.data ?? []).filter((item) => item.isEnabled).toSorted((left, right) => left.sortOrder - right.sortOrder),
        [eventTypesQuery.data],
    );
    const selectedEventType = eventType || eventTypes[0]?.eventTypeKey || '';
    const eligiblePlans = useMemo(() => eligibleProvisioningPlans(plansQuery.data ?? [], selectedEventType), [plansQuery.data, selectedEventType]);
    const selectedPlan = eligiblePlans.find((plan) => plan.code === planTierCode) ?? null;
    const timezoneOptions = useMemo(() => getSupportedTimezones(), []);
    const isTimezoneValid = timezoneOptions.includes(timezone);
    const { startAtMin, startAtMax, endAtMin } = getScheduleDatetimeLocalBounds({ startAt, endAt });
    const scheduleError =
        startAt && isDatetimeLocalBefore(startAt, startAtMin)
            ? tCreate('validation.startInPast')
            : startAt && endAt && !isDatetimeLocalAfter(endAt, startAt)
              ? tCreate('validation.endBeforeStart')
              : null;
    const timezoneError = timezone && !isTimezoneValid ? tCreate('validation.invalidTimezone') : null;
    const fieldErrors = getFieldErrors(provisionEvent.error) ?? {};
    const canReview = Boolean(
        selectedEventType &&
        selectedPlan &&
        title.trim() &&
        startAt &&
        endAt &&
        isTimezoneValid &&
        !scheduleError &&
        locationName.trim() &&
        locationAddress.trim(),
    );

    function fieldError(name: string) {
        return fieldErrors[`event.${name}`] ?? fieldErrors[name];
    }

    function changeEventType(value: EventTypeConvention) {
        setEventType(value);
        setPlanTierCode('');
        provisionEvent.reset();
    }

    async function submit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        provisionEvent.reset();
        if (step === 'event') {
            if (canReview) setStep('review');
            return;
        }
        if (step !== 'review' || !canReview || !selectedEventType || !selectedPlan) return;

        const startAtIso = datetimeLocalValueToIso(startAt);
        const endAtIso = datetimeLocalValueToIso(endAt);
        if (!startAtIso || !endAtIso) return;

        const initialSessionTitleKey = getCreateEventCatalogEntry(selectedEventType)?.initialSessionTitleKey;
        const initialSessionTitle = initialSessionTitleKey && tCreate.has(initialSessionTitleKey) ? tCreate(initialSessionTitleKey) : undefined;

        try {
            await provisionEvent.mutateAsync({
                hostUserId: host.id,
                event: {
                    title: title.trim(),
                    eventType: selectedEventType,
                    planTierCode: selectedPlan.code,
                    visibility,
                    startAt: startAtIso,
                    endAt: endAtIso,
                    timezone,
                    locationName: locationName.trim(),
                    locationAddress: locationAddress.trim(),
                    mapsUrl: mapsUrl.trim() || undefined,
                    brandingSettings: {},
                    initialSessionTitle,
                },
            });
            setStep('success');
        } catch {
            return;
        }
    }

    function provisionAnother() {
        setStep('event');
        setTitle('');
        setStartAt('');
        setEndAt('');
        setLocationName('');
        setLocationAddress('');
        setMapsUrl('');
        provisionEvent.reset();
    }

    return {
        step,
        setStep,
        eventTypes,
        eventTypesQuery,
        selectedEventType,
        changeEventType,
        eligiblePlans,
        plansQuery,
        selectedPlan,
        planTierCode,
        setPlanTierCode,
        title,
        setTitle,
        startAt,
        setStartAt,
        endAt,
        setEndAt,
        timezone,
        setTimezone,
        timezoneOptions,
        timezoneError,
        locationName,
        setLocationName,
        locationAddress,
        setLocationAddress,
        mapsUrl,
        setMapsUrl,
        visibility,
        setVisibility,
        startAtMin,
        startAtMax,
        endAtMin,
        scheduleError,
        fieldErrors,
        fieldError,
        canReview,
        submit,
        result: provisionEvent.data ?? null,
        isPending: provisionEvent.isPending,
        error: provisionEvent.error ? toErrorMessage(provisionEvent.error, t('error')) : null,
        provisionAnother,
    };
}

export type ProvisionEventForm = ReturnType<typeof useProvisionEventForm>;
