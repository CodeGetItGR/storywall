'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { EventAddonsStep } from '@/components/event/create/EventAddonsStep';
import { EventDetailsStep } from '@/components/event/create/EventDetailsStep';
import { EventOverviewStep } from '@/components/event/create/EventOverviewStep';
import { EventPlanSelector } from '@/components/plan/EventPlanSelector';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { useCreateEvent } from '@/hooks/useEvent';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode, getFieldErrors } from '@/lib/api/errors';
import type { EventAddonDto, EventAddonRequestDto, EventRequestDto, EventResponseDto, EventTypeConvention } from '@/lib/api/types';
import { publicAssignableEventAddons } from '@/lib/planModules';
import { publicAssignablePlans } from '@/lib/planTiers';
import { routes } from '@/lib/routes';
import { useEventSwitcher } from '@/providers/EventProvider';

export default function CreateEventPage() {
    const t = useTranslations('CreateEventPage');
    const router = useRouter();
    const { user, isAuthenticated, isBootstrapping } = useAuth();
    const { setActiveEventId } = useEventSwitcher();
    const createEvent = useCreateEvent();
    const { data: appConfig, refetch: refetchAppConfig } = useAppConfig();
    const toErrorMessage = useApiErrorMessage();

    const [title, setTitle] = useState('');
    const [eventType, setEventType] = useState<EventTypeConvention>('WEDDING');
    const [startAt, setStartAt] = useState('');
    const [endAt, setEndAt] = useState('');
    const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [locationName, setLocationName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'plan' | 'addons' | 'details' | 'overview'>('plan');
    const eventPlans = useMemo(() => publicAssignablePlans(appConfig?.planTiers ?? [], 'EVENT'), [appConfig?.planTiers]);
    const [selectedPlanCode, setSelectedPlanCode] = useState<string>('');
    const [selectedAddonCodes, setSelectedAddonCodes] = useState<string[]>([]);
    const [createdDraftEventId, setCreatedDraftEventId] = useState<string | null>(null);

    const fieldErrors = getFieldErrors(createEvent.error);
    const selectedPlan = eventPlans.find((plan) => plan.code === selectedPlanCode) ?? eventPlans[0];
    const selectedCode = selectedPlan?.code ?? selectedPlanCode;
    const availableAddons = useMemo(
        () => publicAssignableEventAddons(appConfig?.paidServices ?? [], appConfig?.modules ?? [], selectedPlan),
        [appConfig?.modules, appConfig?.paidServices, selectedPlan]
    );
    const selectedAddonServices = availableAddons.filter((service) => selectedAddonCodes.includes(service.code));
    const selectedEligibleAddonCodes = selectedAddonServices.map((service) => service.code);

    useEffect(() => {
        if (isBootstrapping) return;
        if (!isAuthenticated) {
            router.replace(routes.login);
            return;
        }
        if (user?.role === 'ADMIN') router.replace(routes.admin);
    }, [isAuthenticated, isBootstrapping, router, user?.role]);

    useEffect(() => {
        if (step === 'plan') {
            void refetchAppConfig();
        }
    }, [refetchAppConfig, step]);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        if (step === 'details') {
            if (title.trim() && startAt && endAt) setStep('overview');
            return;
        }
        if (step === 'addons') {
            return;
        }
        if (step !== 'overview') return;
        if (createdDraftEventId) {
            router.push(routes.manage);
            return;
        }
        if (!title.trim() || !startAt || !endAt) return;

        const input: EventRequestDto = {
            title: title.trim(),
            planTierCode: selectedCode,
            eventType,
            visibility: 'PRIVATE',
            startAt: new Date(startAt).toISOString(),
            endAt: new Date(endAt).toISOString(),
            timezone,
            locationName: locationName.trim() || undefined,
            brandingSettings: {},
            isArchived: false,
        };

        let event: EventResponseDto | null = null;

        try {
            event = await createEvent.mutateAsync(input);
            setActiveEventId(event.id);

            for (const service of selectedAddonServices) {
                const addonInput: EventAddonRequestDto = { paidServiceCode: service.code };
                await api.post<EventAddonDto>(endpoints.events.addons(event.id), addonInput);
            }

            router.push(routes.events.checkoutReview(event.id, 'activation'));
        } catch (err) {
            if (event) {
                setCreatedDraftEventId(event.id);
                setError(t('paidModules.applyFailed'));
                return;
            }

            if (Object.keys(getFieldErrors(err) ?? {}).length > 0) {
                setStep('details');
                return;
            }

            if (getErrorCode(err) === ERROR_CODES.ACTIVE_EVENT_LIMIT_EXCEEDED) {
                setError(t('activeEventLimitExceeded'));
                return;
            }

            setError(toErrorMessage(err));
        }
    }

    const routeBack = useCallback(() => {
        router.back();
    }, [router]);

    const onTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    }, []);

    const onEventTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setEventType(e.target.value as EventTypeConvention);
    }, []);

    const onStartAtChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setStartAt(e.target.value);
    }, []);

    const onEndAtChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEndAt(e.target.value);
    }, []);

    const onTimezoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setTimezone(e.target.value);
    }, []);

    const onLocationNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setLocationName(e.target.value);
    }, []);

    const goToAddons = useCallback(() => {
        setStep('addons');
    }, []);

    const goToPlan = useCallback(() => {
        setStep('plan');
    }, []);

    const goToDetails = useCallback(() => {
        setStep('details');
    }, []);

    const toggleAddon = useCallback((code: string) => {
        setSelectedAddonCodes((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));
    }, []);

    return (
        <CreateEventRouteState
            isBlocked={isBootstrapping || !isAuthenticated || user?.role === 'ADMIN'}
            content={
                <main className="h-full overflow-y-auto bg-background">
                    <div className="mx-auto max-w-2xl px-4 pb-24 lg:pb-8">
                        <div className="mb-2 flex items-center gap-3 py-4">
                            <button
                                onClick={routeBack}
                                aria-label={t('goBack')}
                                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="text-base font-bold text-ink">{t('title')}</h1>
                        </div>

                        <div className="rounded-xl bg-card p-5 shadow-2xs">
                            <p className="mb-5 text-sm text-ink-muted">
                                {step === 'plan' && t('steps.planSubtitle')}
                                {step === 'addons' && t('steps.addonsSubtitle')}
                                {step === 'details' && t('subtitle')}
                                {step === 'overview' && t('steps.overviewSubtitle')}
                            </p>

                            <div className="mb-5 grid grid-cols-4 gap-1.5 text-[11px] font-semibold sm:gap-2 sm:text-xs">
                                {(['plan', 'addons', 'details', 'overview'] as const).map((item) => (
                                    <div
                                        key={item}
                                        className={`rounded-full px-1.5 py-2 text-center transition sm:px-3 ${
                                            step === item ? 'bg-ink text-white' : 'bg-surface-muted text-ink-muted'
                                        }`}
                                    >
                                        {t(`steps.${item}`)}
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={handleSubmit}>
                                {step === 'plan' && (
                                    <EventPlanSelector
                                        plans={eventPlans}
                                        modules={appConfig?.modules ?? []}
                                        paidServices={appConfig?.paidServices ?? []}
                                        selectedCode={selectedCode}
                                        onSelect={setSelectedPlanCode}
                                        onContinue={goToAddons}
                                    />
                                )}

                                {step === 'addons' && (
                                    <EventAddonsStep
                                        modules={appConfig?.modules ?? []}
                                        services={availableAddons}
                                        selectedCodes={selectedEligibleAddonCodes}
                                        onToggle={toggleAddon}
                                        onBack={goToPlan}
                                        onContinue={goToDetails}
                                    />
                                )}

                                {step === 'details' && (
                                    <EventDetailsStep
                                        selectedPlan={selectedPlan}
                                        title={title}
                                        titleError={fieldErrors?.title}
                                        eventType={eventType}
                                        startAt={startAt}
                                        endAt={endAt}
                                        timezone={timezone}
                                        locationName={locationName}
                                        onTitleChange={onTitleChange}
                                        onEventTypeChange={onEventTypeChange}
                                        onStartAtChange={onStartAtChange}
                                        onEndAtChange={onEndAtChange}
                                        onTimezoneChange={onTimezoneChange}
                                        onLocationNameChange={onLocationNameChange}
                                        onBack={goToAddons}
                                    />
                                )}

                                {step === 'overview' && selectedPlan && (
                                    <EventOverviewStep
                                        title={title.trim()}
                                        eventType={eventType}
                                        startAt={startAt}
                                        endAt={endAt}
                                        locationName={locationName.trim()}
                                        plan={selectedPlan}
                                        modules={appConfig?.modules ?? []}
                                        addons={selectedAddonServices}
                                        isPending={createEvent.isPending}
                                        error={error}
                                        hasDraft={Boolean(createdDraftEventId)}
                                        onBack={goToDetails}
                                    />
                                )}
                            </form>
                        </div>
                    </div>
                </main>
            }
        />
    );
}

function CreateEventRouteState({ content, isBlocked }: { content: React.ReactNode; isBlocked: boolean }) {
    if (!isBlocked) {
        return content;
    }

    return (
        <main className="flex h-full items-center justify-center bg-background">
            <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
        </main>
    );
}
