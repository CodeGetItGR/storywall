'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { RsvpForm, RsvpHeader, RsvpSubmittedView } from '@/components/rsvp';
import { useAppRsvpConfig } from '@/hooks/useAppConfig';
import { useCreateRsvp, useRsvp, useUpdateRsvp } from '@/hooks/useRsvps';
import { ApiError } from '@/lib/api/client';
import { getErrorMessage, isModuleNotAvailableError } from '@/lib/api/errors';
import { AttendanceStatus, RsvpPlusOnes } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';
import { rsvpStorageKey } from '@/lib/storageKeys';
import { useActiveEvent, useActiveMember, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

type AttendingStatus = 'attending' | 'not-attending';

type RsvpSubmitContextValue = {
    attending: AttendingStatus | null;
    canSubmitRsvp: boolean;
    isSubmitting: boolean;
    memberId: string | null;
    message: string;
    onAttend: () => void;
    onBackToWall: () => void;
    onDecline: () => void;
    onDecrementPlusOnes: (type: 'adult' | 'child') => () => void;
    onGoBack: () => void;
    onIncrementPlusOnes: (type: 'adult' | 'child') => () => void;
    onMessageChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onSubmit: (event: React.SubmitEvent<HTMLFormElement>) => void;
    plusOnes: RsvpPlusOnes;
    submitErrorMessage: string | null;
    t: ReturnType<typeof useTranslations>;
};

const RsvpSubmitContext = createContext<RsvpSubmitContextValue | null>(null);

function useRsvpSubmitPage() {
    const context = useContext(RsvpSubmitContext);
    if (!context) {
        throw new Error('useRsvpSubmitPage must be used within RsvpSubmitContext');
    }

    return context;
}

export default function RsvpSubmitBoundary() {
    const t = useTranslations('RSVPPage');
    const router = useRouter();
    const searchParams = useSearchParams();

    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const eventId = activeEvent?.id ?? null;
    const memberId = activeMember?.id ?? null;
    const isHost = useIsHost();
    const isContextLoading = useEventContextLoading();
    const rsvpConfig = useAppRsvpConfig();
    const minAdultPlusOnes = Math.max(0, (rsvpConfig?.minAdults ?? 1) - 1);
    const maxAdultPlusOnes = Math.max(minAdultPlusOnes, (rsvpConfig?.maxAdults ?? 5) - 1);
    const minChildCount = rsvpConfig?.minChildren ?? 0;
    const maxChildCount = rsvpConfig?.maxChildren ?? 4;

    const presetAttending = searchParams.get('attending');

    const [attending, setAttending] = useState<AttendingStatus | null>(
        presetAttending === 'attending' || presetAttending === 'not-attending' ? presetAttending : null
    );
    const [message, setMessage] = useState('');
    const [plusOnes, setPlusOnes] = useState<RsvpPlusOnes>({
        adultCount: minAdultPlusOnes,
        childCount: minChildCount,
    });
    const [submitted, setSubmitted] = useState(false);
    const rsvpId = useMemo(() => {
        if (!memberId || typeof window === 'undefined') {
            return undefined;
        }

        return window.localStorage.getItem(rsvpStorageKey(memberId));
    }, [memberId]);

    const { data: existingRsvp, error: existingRsvpError } = useRsvp(rsvpId ?? null);
    const isStaleRsvp = existingRsvpError instanceof ApiError && existingRsvpError.status === 404;
    const effectiveRsvpId = isStaleRsvp ? null : rsvpId;

    const hydratedRef = useRef(false);

    useEffect(() => {
        if (!existingRsvp || hydratedRef.current) {
            return;
        }

        hydratedRef.current = true;

        setAttending(existingRsvp.attendanceStatus === 'ATTENDING' ? 'attending' : 'not-attending');
        setPlusOnes({
            adultCount: Math.max(minAdultPlusOnes, Math.min(maxAdultPlusOnes, existingRsvp.adultCount - 1)),
            childCount: Math.max(minChildCount, Math.min(maxChildCount, existingRsvp.childCount)),
        });
        setMessage(existingRsvp.notes ?? '');
    }, [existingRsvp, maxAdultPlusOnes, maxChildCount, minAdultPlusOnes, minChildCount]);

    useEffect(() => {
        if (!isContextLoading && isHost) {
            router.replace(routes.tools.rsvp);
        }
    }, [isContextLoading, isHost, router]);

    useEffect(() => {
        if (!memberId || !isStaleRsvp || !rsvpId) {
            return;
        }

        window.localStorage.removeItem(rsvpStorageKey(memberId));
        router.refresh();
    }, [isStaleRsvp, memberId, rsvpId, router]);

    const createRsvp = useCreateRsvp(eventId ?? undefined);
    const updateRsvp = useUpdateRsvp(effectiveRsvpId ?? '', eventId ?? undefined);

    const isSubmitting = createRsvp.isPending || updateRsvp.isPending;
    const canSubmitRsvp = isEventWritable(activeEvent?.status);
    const submitError = createRsvp.error ?? updateRsvp.error;
    const submitErrorMessage = submitError
        ? isModuleNotAvailableError(submitError)
            ? t('moduleUnavailable')
            : getErrorMessage(submitError, t('submitError'))
        : null;

    const handleGoBack = useCallback(() => {
        router.back();
    }, [router]);

    const handleBackToWall = useCallback(() => {
        router.push(routes.feed);
    }, [router]);

    const handleAttend = useCallback(() => {
        setAttending('attending');
    }, []);

    const handleDecline = useCallback(() => {
        setAttending('not-attending');
    }, []);

    const handleIncrementPlusOnes = useCallback(
        (type: 'adult' | 'child') => () => {
            setPlusOnes((currentPlusOnes) => ({
                adultCount: type === 'adult' ? Math.min(maxAdultPlusOnes, currentPlusOnes.adultCount + 1) : currentPlusOnes.adultCount,
                childCount: type === 'child' ? Math.min(maxChildCount, currentPlusOnes.childCount + 1) : currentPlusOnes.childCount,
            }));
        },
        [maxAdultPlusOnes, maxChildCount]
    );

    const handleDecrementPlusOnes = useCallback(
        (type: 'adult' | 'child') => () => {
            setPlusOnes((currentPlusOnes) => ({
                adultCount: type === 'adult' ? Math.max(minAdultPlusOnes, currentPlusOnes.adultCount - 1) : currentPlusOnes.adultCount,
                childCount: type === 'child' ? Math.max(minChildCount, currentPlusOnes.childCount - 1) : currentPlusOnes.childCount,
            }));
        },
        [minAdultPlusOnes, minChildCount]
    );

    const handleMessageChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(event.target.value);
    }, []);

    const handleSubmit = useCallback(
        async (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();

            if (!attending || !memberId || !canSubmitRsvp) {
                return;
            }

            const attendanceStatus: AttendanceStatus = attending === 'attending' ? 'ATTENDING' : 'DECLINED';

            const adultCount = 1 + plusOnes.adultCount;
            const childCount = plusOnes.childCount;

            try {
                if (effectiveRsvpId) {
                    await updateRsvp.mutateAsync({
                        attendanceStatus,
                        adultCount,
                        childCount,
                        notes: message || undefined,
                    });
                } else {
                    const created = await createRsvp.mutateAsync({
                        eventMemberId: memberId,
                        attendanceStatus,
                        adultCount,
                        childCount,
                        notes: message || undefined,
                        submittedAt: new Date().toISOString(),
                    });

                    localStorage.setItem(rsvpStorageKey(memberId), created.id);
                }
            } catch {
                return;
            }

            setSubmitted(true);
        },
        [attending, canSubmitRsvp, effectiveRsvpId, message, createRsvp, updateRsvp, memberId, plusOnes.adultCount, plusOnes.childCount]
    );

    return (
        <RsvpSubmitContext.Provider
            value={{
                attending,
                canSubmitRsvp,
                isSubmitting,
                memberId,
                message,
                onAttend: handleAttend,
                onBackToWall: handleBackToWall,
                onDecline: handleDecline,
                onDecrementPlusOnes: handleDecrementPlusOnes,
                onGoBack: handleGoBack,
                onIncrementPlusOnes: handleIncrementPlusOnes,
                onMessageChange: handleMessageChange,
                onSubmit: handleSubmit,
                plusOnes,
                submitErrorMessage,
                t,
            }}
        >
            <RsvpSubmitState isSubmitted={submitted} />
        </RsvpSubmitContext.Provider>
    );
}

function RsvpSubmitState({ isSubmitted }: { isSubmitted: boolean }) {
    if (isSubmitted) {
        return <RsvpSubmittedContent />;
    }

    return <RsvpSubmitFormContent />;
}

function RsvpSubmittedContent() {
    const { attending, onBackToWall, onGoBack } = useRsvpSubmitPage();

    return (
        <div className="mx-auto max-w-2xl px-4 pb-24 lg:pb-8">
            <RsvpHeader onGoBack={onGoBack} />
            <RsvpSubmittedView attending={attending} onBackToWall={onBackToWall} />
        </div>
    );
}

function RsvpSubmitFormContent() {
    const {
        attending,
        canSubmitRsvp,
        isSubmitting,
        memberId,
        message,
        onAttend,
        onDecline,
        onDecrementPlusOnes,
        onGoBack,
        onIncrementPlusOnes,
        onMessageChange,
        onSubmit,
        plusOnes,
        submitErrorMessage,
        t,
    } = useRsvpSubmitPage();

    return (
        <div className="mx-auto max-w-2xl px-4 pb-24 lg:pb-8">
            <RsvpHeader onGoBack={onGoBack} />

            <RsvpForm
                attending={attending}
                onAttend={onAttend}
                onDecline={onDecline}
                plusOnes={plusOnes}
                onIncrementPlusOnes={onIncrementPlusOnes}
                onDecrementPlusOnes={onDecrementPlusOnes}
                message={message}
                onMessageChange={onMessageChange}
                onSubmit={onSubmit}
                submitDisabled={!attending || !memberId || isSubmitting || !canSubmitRsvp}
                submitError={!canSubmitRsvp ? t('eventReadOnly') : submitErrorMessage}
            />
        </div>
    );
}
