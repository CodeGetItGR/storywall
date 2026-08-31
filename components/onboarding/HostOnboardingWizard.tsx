'use client';

import { Calendar, HelpCircle, PartyPopper, Settings, Sparkles, UserPlus } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { isEventRoute } from '@/components/layout/mobile-tab-bar';
import { OnboardingInfoStep } from '@/components/onboarding/steps/OnboardingInfoStep';
import { OnboardingLinksStep } from '@/components/onboarding/steps/OnboardingLinksStep';
import { OnboardingToolsStep } from '@/components/onboarding/steps/OnboardingToolsStep';
import { OnboardingVenueStep } from '@/components/onboarding/steps/OnboardingVenueStep';
import { Modal } from '@/components/ui/modal';
import { useEventInvitations } from '@/hooks/useEventInvitations';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { consumeCheckoutSetupPrompt } from '@/lib/billing';
import { getOnboardingStepIds } from '@/lib/onboardingSteps';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useActiveEvent, useIsHost } from '@/providers/EventProvider';

export function HostOnboardingWizard() {
    const t = useTranslations('HostOnboarding');
    const event = useActiveEvent();
    const isHost = useIsHost();
    const pathname = usePathname();
    const isOnEventRoute = isEventRoute(pathname);
    const isFeedRoute = Boolean(event?.id && pathname === routes.events.feed(event.id));
    const { isOpen, isComplete, stepIndex: rawStepIndex, open, openAt, next, back, dismiss, complete } = useOnboardingProgress(event?.id ?? null);
    const [checkoutGuideEventId, setCheckoutGuideEventId] = useState<string | null>(null);
    const { data: invitations, isLoading: invitationsLoading } = useEventInvitations(isHost && event ? event.id : null);

    const stepIds = useMemo(() => (event ? getOnboardingStepIds(event.eventType) : []), [event]);
    const firstMissingStepIndex = useMemo(() => {
        if (!event || invitationsLoading || !invitations) return null;

        const missingVenue = stepIds.includes('venue') && !event.sessions.some((session) => session.isSecondary && !session.deletedAt);
        if (missingVenue) return stepIds.indexOf('venue');

        const missingInvite = invitations.length === 0;
        if (missingInvite) return stepIds.indexOf('invite');

        return null;
    }, [event, invitations, invitationsLoading, stepIds]);
    const shouldOfferSetup = firstMissingStepIndex !== null;

    useEffect(() => {
        if (!event || !isHost || event.status === 'DRAFT' || !isFeedRoute || !shouldOfferSetup) return;
        if (!consumeCheckoutSetupPrompt(event.id)) return;

        const timer = window.setTimeout(() => setCheckoutGuideEventId(event.id), 900);
        return () => window.clearTimeout(timer);
    }, [event, isFeedRoute, isHost, shouldOfferSetup]);
    // Clamped defensively: stored progress (or a stale `next()` call from a
    // render where `stepIds` was momentarily empty) can otherwise point past
    // the current step list and render a blank modal with no way out.
    const stepIndex = Math.min(Math.max(rawStepIndex, 0), Math.max(stepIds.length - 1, 0));
    const stepId = stepIds[stepIndex];
    const isLastStep = stepIndex === stepIds.length - 1;

    function handleContinue() {
        if (isLastStep) {
            complete();
            setCheckoutGuideEventId(null);
            return;
        }
        next(stepIds.length);
    }

    function handleOpen() {
        setCheckoutGuideEventId(null);
        if (firstMissingStepIndex !== null) {
            openAt(firstMissingStepIndex);
            return;
        }
        open();
    }

    if (!event || !isHost || event.status === 'DRAFT' || !isOnEventRoute) return null;

    const showCheckoutGuide = checkoutGuideEventId === event.id;

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
            {showCheckoutGuide && !isOpen && <div className="motion-onboarding-backdrop fixed inset-0 z-30 bg-ink/42 backdrop-blur-[2px]" />}

            {!isOpen && (!isComplete || shouldOfferSetup) && (
                <div className={cn('fixed bottom-20 left-4 z-30 lg:bottom-6', showCheckoutGuide && 'z-40')}>
                    {/* Setup launcher */}
                    <button
                        type="button"
                        onClick={handleOpen}
                        aria-label={t('reopen')}
                        className={cn(
                            'motion-onboarding-guide flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background shadow-md transition-transform hover:scale-105',
                            showCheckoutGuide && 'motion-onboarding-spotlight border-primary bg-card shadow-[0_18px_55px_rgba(255,122,89,0.32)]'
                        )}
                    >
                        <HelpCircle className="h-5 w-5 text-primary" strokeWidth={2.2} aria-hidden="true" />
                    </button>
                    {showCheckoutGuide && (
                        <button
                            type="button"
                            onClick={handleOpen}
                            className="motion-onboarding-bubble absolute bottom-14 left-0 w-56 rounded-2xl bg-background px-4 py-3 text-left text-sm font-semibold leading-5 text-ink shadow-[0_18px_45px_rgba(36,31,26,0.22)]"
                        >
                            {t('checkoutGuide')}
                        </button>
                    )}
                </div>
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
                        <OnboardingVenueStep
                            href={routes.events.tools.schedule(event.id, { section: 'venue-session' })}
                            hasVenue={event.sessions.some((session) => session.isSecondary)}
                            onNavigate={dismiss}
                            onDone={handleContinue}
                        />
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
