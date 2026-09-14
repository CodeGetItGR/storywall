'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { CreateEventRouteState } from '@/components/event/create/CreateEventRouteState';
import { EventCreateFooter } from '@/components/event/create/EventCreateFooter';
import { EventCreateStepBreadcrumb } from '@/components/event/create/EventCreateStepBreadcrumb';
import { EventDetailsStep } from '@/components/event/create/EventDetailsStep';
import { EventOverviewStep } from '@/components/event/create/EventOverviewStep';
import { EventTypeStep } from '@/components/event/create/EventTypeStep';
import { EventPlanSelector } from '@/components/plan/EventPlanSelector';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';
import { CreateEventFormProvider } from '@/providers/CreateEventFormProvider';

export default function CreateEventPage() {
    const router = useRouter();
    const { user, isAuthenticated, isBootstrapping } = useAuth();
    // Confirmed unverified (not just "not yet known") — the home screen is
    // where this is explained and where the flow should have been blocked
    // from starting in the first place; a direct visit to this URL must not
    // be a way around that.
    const isConfirmedUnverified = user?.emailVerified === false;

    useEffect(() => {
        if (isBootstrapping) return;
        if (!isAuthenticated) {
            router.replace(routes.login);
            return;
        }
        if (user?.role === 'ADMIN') {
            router.replace(routes.admin);
            return;
        }
        if (isConfirmedUnverified) router.replace(routes.home);
    }, [isAuthenticated, isBootstrapping, isConfirmedUnverified, router, user?.role]);

    return (
        <CreateEventRouteState
            isBlocked={isBootstrapping || !isAuthenticated || user?.role === 'ADMIN' || isConfirmedUnverified}
            content={
                <CreateEventFormProvider>
                    <CreateEventFormBody />
                </CreateEventFormProvider>
            }
        />
    );
}

function CreateEventFormBody() {
    const t = useTranslations('CreateEventPage');
    const { step, formId, handleSubmit, eventPlans, modules, selectedCode, onSelectPlan, isPlansLoading } = useCreateEventForm();

    return (
        <main className="flex h-full flex-col bg-background">
            <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-4">
                {/* Header */}
                <div className="flex shrink-0 items-center gap-3 py-4">
                    <BackButton variant="icon" href={routes.home} label={t('goBack')} />
                    <h1 className="text-base font-bold text-ink">{t('title')}</h1>
                </div>

                {/* Steps */}
                <EventCreateStepBreadcrumb />

                {/* Form Shell */}
                <div className="mt-3 min-h-0 flex-1 overflow-y-auto p-5">
                    <form id={formId} onSubmit={handleSubmit}>
                        {/* Subtitle */}
                        <h2 className="text-lg font-bold text-ink mb-5">
                            {step === 'type' && t('steps.typeSubtitle')}
                            {step === 'plan' && t('steps.planSubtitle')}
                            {step === 'details' && t('subtitle')}
                            {step === 'overview' && t('steps.overviewSubtitle')}
                        </h2>

                        {step === 'type' && <EventTypeStep />}

                        {step === 'plan' && (
                            <EventPlanSelector
                                plans={eventPlans}
                                modules={modules}
                                selectedCode={selectedCode}
                                onSelectAction={onSelectPlan}
                                isLoading={isPlansLoading}
                            />
                        )}

                        {step === 'details' && <EventDetailsStep />}

                        {step === 'overview' && <EventOverviewStep />}
                    </form>
                </div>
            </div>
            <EventCreateFooter />
        </main>
    );
}
