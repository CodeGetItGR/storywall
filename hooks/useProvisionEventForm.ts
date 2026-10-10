'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { useAdminPlanTiers, useAdminPlatformEventTypes } from '@/hooks/useAdmin';
import { useProvisionAdminEventMutation } from '@/hooks/useAdminAccounts';
import { useAdminDurationPick } from '@/hooks/useAdminDurationPick';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useThemePresetsForType } from '@/hooks/useEventTheme';
import { eligibleProvisioningPlans, type ProvisionHost } from '@/lib/adminAccountProvisioning';
import { getFieldErrors } from '@/lib/api/errors';
import type { EventResponseDto, EventTypeConvention, EventVisibility } from '@/lib/api/types';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { effectiveThemePresetId } from '@/lib/createEventSteps';
import { datetimeLocalValueToIso, getScheduleDatetimeLocalBounds, isDatetimeLocalBefore } from '@/lib/datetime';
import { getCurrentTimezone, getSupportedTimezones } from '@/lib/timezones';

export type ProvisionEventStep = 'event' | 'review' | 'success';

export type ProvisionEventOptions = {
    // Fixes the event type (the form shows it but can't change it).
    eventType?: EventTypeConvention;
    // Runs after the event is created, before the success step shows.
    onProvisioned?: (event: EventResponseDto) => Promise<unknown>;
};

export function useProvisionEventForm(host: ProvisionHost, options: ProvisionEventOptions = {}) {
    const tCreate = useTranslations('CreateEventPage');
    const t = useTranslations('AdminPage.accounts.provision');
    const toErrorMessage = useApiErrorMessage();
    const eventTypesQuery = useAdminPlatformEventTypes();
    const plansQuery = useAdminPlanTiers('EVENT');
    const provisionEvent = useProvisionAdminEventMutation();
    const { data: appConfig } = useAppConfig();

    const [step, setStep] = useState<ProvisionEventStep>('event');
    const [eventType, setEventType] = useState<EventTypeConvention | ''>(options.eventType ?? '');
    const [planTierCode, setPlanTierCode] = useState('');
    const [title, setTitle] = useState('');
    const [startAt, setStartAt] = useState('');
    const [timezone, setTimezone] = useState(getCurrentTimezone);
    const [locationName, setLocationName] = useState('');
    const [locationAddress, setLocationAddress] = useState('');
    const [mapsUrl, setMapsUrl] = useState('');
    const [visibility, setVisibility] = useState<EventVisibility>('PRIVATE');
    const [description, setDescription] = useState('');
    const [rsvpDeadline, setRsvpDeadline] = useState('');
    const [themePresetId, setThemePresetId] = useState<string | null>(null);

    const eventTypes = useMemo(
        () => (eventTypesQuery.data ?? []).filter((item) => item.isEnabled).toSorted((left, right) => left.sortOrder - right.sortOrder),
        [eventTypesQuery.data],
    );
    const selectedEventType = eventType || eventTypes[0]?.eventTypeKey || '';
    const eligiblePlans = useMemo(() => eligibleProvisioningPlans(plansQuery.data ?? [], selectedEventType), [plansQuery.data, selectedEventType]);
    const selectedPlan = eligiblePlans.find((plan) => plan.code === planTierCode) ?? null;
    // Preselects the plan's shortest duration, which is what the server would pick.
    const duration = useAdminDurationPick(selectedPlan, { preselectShortest: true });
    // Theme and RSVP deadline show only when the plan includes the module; the type is covered too,
    // since a plan can't list a module its type doesn't support.
    const planHasTheme = selectedPlan?.moduleKeys.includes('theme') ?? false;
    const planHasRsvp = selectedPlan?.moduleKeys.includes('rsvp') ?? false;
    const themePresetsQuery = useThemePresetsForType(planHasTheme ? selectedEventType : null);
    const themePresets = planHasTheme ? themePresetsQuery.data : undefined;
    const isThemeAvailable = planHasTheme && (themePresetsQuery.isLoading || (themePresets?.length ?? 0) > 0);
    const selectedThemePresetId = effectiveThemePresetId(themePresetId, themePresets);
    const selectedThemePreset = themePresets?.find((preset) => preset.id === selectedThemePresetId) ?? null;
    const timezoneOptions = useMemo(() => getSupportedTimezones(), []);
    const isTimezoneValid = timezoneOptions.includes(timezone);
    const { startAtMin, startAtMax } = getScheduleDatetimeLocalBounds({ startAt, endAt: '' });
    const scheduleError =
        startAt && isDatetimeLocalBefore(startAt, startAtMin)
            ? tCreate('validation.startInPast')
            : null;
    const rsvpDeadlineError =
        planHasRsvp && rsvpDeadline && startAt && !isDatetimeLocalBefore(rsvpDeadline, startAt) ? t('rsvpDeadlineAfterStart') : null;
    const timezoneError = timezone && !isTimezoneValid ? tCreate('validation.invalidTimezone') : null;
    const fieldErrors = getFieldErrors(provisionEvent.error) ?? {};
    const canReview = Boolean(
        selectedEventType &&
        selectedPlan &&
        title.trim() &&
        startAt &&
        isTimezoneValid &&
        !scheduleError &&
        !rsvpDeadlineError &&
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
        if (!startAtIso) return;
        const rsvpDeadlineIso = planHasRsvp && rsvpDeadline ? (datetimeLocalValueToIso(rsvpDeadline) ?? undefined) : undefined;

        const initialSessionTitleKey = getCreateEventCatalogEntry(selectedEventType)?.initialSessionTitleKey;
        const initialSessionTitle = initialSessionTitleKey && tCreate.has(initialSessionTitleKey) ? tCreate(initialSessionTitleKey) : undefined;

        try {
            const created = await provisionEvent.mutateAsync({
                hostUserId: host.id,
                event: {
                    title: title.trim(),
                    description: description.trim() || undefined,
                    eventType: selectedEventType,
                    planTierCode: selectedPlan.code,
                    coverageOptionId: duration.optionId || undefined,
                    visibility,
                    startAt: startAtIso,
                    timezone,
                    locationName: locationName.trim(),
                    locationAddress: locationAddress.trim(),
                    mapsUrl: mapsUrl.trim() || undefined,
                    brandingSettings: {},
                    initialSessionTitle,
                    rsvpDeadline: rsvpDeadlineIso,
                    themePresetId: selectedThemePresetId ?? undefined,
                },
            });
            // A failure here is the caller's to show; the event itself was created.
            await options.onProvisioned?.(created).catch(() => undefined);
            setStep('success');
        } catch {
            return;
        }
    }

    function provisionAnother() {
        setStep('event');
        setTitle('');
        setStartAt('');
        setLocationName('');
        setLocationAddress('');
        setMapsUrl('');
        setDescription('');
        setRsvpDeadline('');
        setThemePresetId(null);
        provisionEvent.reset();
    }

    return {
        step,
        setStep,
        eventTypes,
        eventTypesQuery,
        isEventTypeFixed: Boolean(options.eventType),
        selectedEventType,
        changeEventType,
        eligiblePlans,
        plansQuery,
        selectedPlan,
        planTierCode,
        setPlanTierCode,
        duration,
        title,
        setTitle,
        startAt,
        setStartAt,
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
        description,
        setDescription,
        descriptionMaxLength: appConfig?.contentLimits.eventDescriptionMaxLength ?? 2000,
        planHasRsvp,
        rsvpDeadline,
        setRsvpDeadline,
        rsvpDeadlineError,
        isThemeAvailable,
        themePresets: themePresets ?? [],
        themePresetsQuery,
        selectedThemePresetId,
        selectedThemePreset,
        setThemePresetId,
        startAtMin,
        startAtMax,
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
