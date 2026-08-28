'use client';

import { Calendar, HelpCircle, PartyPopper, Settings, Sparkles, UserPlus } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { isEventRoute } from '@/components/layout/mobile-tab-bar';
import { OnboardingInfoStep } from '@/components/onboarding/steps/OnboardingInfoStep';
import { OnboardingLinksStep } from '@/components/onboarding/steps/OnboardingLinksStep';
import { OnboardingToolsStep } from '@/components/onboarding/steps/OnboardingToolsStep';
import { OnboardingVenueStep } from '@/components/onboarding/steps/OnboardingVenueStep';
import { Modal } from '@/components/ui/modal';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { getOnboardingStepIds } from '@/lib/onboardingSteps';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useActiveEvent, useIsHost } from '@/providers/EventProvider';

export function HostOnboardingWizard() {
    const t = useTranslations('HostOnboarding');
    const tCreateEvent = useTranslations('CreateEventPage');
    const event = useActiveEvent();
    const isHost = useIsHost();
    const pathname = usePathname();
    const isOnEventRoute = isEventRoute(pathname) || pathname.startsWith('/tools/');
    const { isOpen, isComplete, stepIndex, open, next, back, dismiss, complete } = useOnboardingProgress(event?.id ?? null);

    const stepIds = useMemo(() => (event ? getOnboardingStepIds(event.eventType) : []), [event]);
    const stepId = stepIds[stepIndex];
    const isLastStep = stepIndex === stepIds.length - 1;

    const secondarySessionTitleKey = event ? getCreateEventCatalogEntry(event.eventType)?.secondarySessionTitleKey : undefined;
    const venueTitle = secondarySessionTitleKey && tCreateEvent.has(secondarySessionTitleKey) ? tCreateEvent(secondarySessionTitleKey) : '';

    function handleContinue() {
        if (isLastStep) {
            complete();
            return;
        }
        next(stepIds.length);
    }

    if (!event || !isHost || event.status === 'DRAFT' || !isOnEventRoute) return null;

    const dashboardItems = [
        {
            key: 'settings',
            icon: Settings,
            iconClassName: 'text-slate-500',
            href: routes.events.manage(event.id, { tab: 'settings' }),
            label: t('dashboard.items.settings'),
        },
        {
            key: 'schedule',
            icon: Calendar,
            iconClassName: 'text-amber-500',
            href: routes.events.tools.schedule(event.id),
            label: t('dashboard.items.schedule'),
        },
    ];

    return (
        <>
            {!isOpen && !isComplete && (
                <button
                    type="button"
                    onClick={open}
                    aria-label={t('reopen')}
                    className="motion-onboarding-guide fixed bottom-20 left-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background shadow-md transition-transform hover:scale-105 lg:bottom-6"
                >
                    <HelpCircle className="h-5 w-5 text-primary" strokeWidth={2.2} aria-hidden="true" />
                </button>
            )}

            <Modal open={isOpen} onClose={dismiss} size="md" variant="sheet" closeLabel={t('close')} className="sm:max-w-md">
                {/* Progress */}
                <div className="flex items-center justify-center gap-1.5 border-b border-border/70 bg-background/95 px-4 pt-5 pb-4 backdrop-blur-sm">
                    {stepIds.map((id, index) => (
                        <span
                            key={id}
                            className={cn('h-1.5 w-6 rounded-full', index === stepIndex ? 'bg-primary' : 'bg-border')}
                            aria-hidden="true"
                        />
                    ))}
                </div>

                <Modal.Body className="px-5 py-5">
                    {stepId === 'welcome' && (
                        <OnboardingInfoStep icon={PartyPopper} title={t('welcome.title', { eventTitle: event.title })} body={t('welcome.body')} />
                    )}

                    {stepId === 'dashboard' && (
                        <OnboardingLinksStep title={t('dashboard.title')} body={t('dashboard.body')} items={dashboardItems} onNavigate={dismiss} />
                    )}

                    {stepId === 'venue' && (
                        <OnboardingVenueStep eventId={event.id} sessions={event.sessions} defaultTitle={venueTitle} onDone={handleContinue} />
                    )}

                    {stepId === 'invite' && (
                        <OnboardingInfoStep
                            icon={UserPlus}
                            title={t('invite.title')}
                            body={t('invite.body')}
                            linkHref={routes.events.manage(event.id, { tab: 'invitations' })}
                            linkLabel={t('invite.link')}
                            onLinkClick={dismiss}
                        />
                    )}

                    {stepId === 'tools' && <OnboardingToolsStep eventId={event.id} eventModules={event.modules} onNavigate={dismiss} />}

                    {stepId === 'done' && <OnboardingInfoStep icon={Sparkles} title={t('done.title')} body={t('done.body')} />}
                </Modal.Body>

                {/* Footer */}
                {stepId !== 'venue' && (
                    <div className="flex items-center gap-3 border-t border-border/70 bg-background/95 px-5 py-4 backdrop-blur-sm">
                        {stepIndex > 0 ? (
                            <button
                                type="button"
                                onClick={back}
                                className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted/70"
                            >
                                {t('back')}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={dismiss}
                                className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted/70"
                            >
                                {t('skip')}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleContinue}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-brand px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                        >
                            {isLastStep ? t('done.close') : t('continue')}
                        </button>
                    </div>
                )}
            </Modal>
        </>
    );
}
