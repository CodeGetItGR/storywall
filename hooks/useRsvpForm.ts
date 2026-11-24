import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig, useAppRsvpConfig } from '@/hooks/useAppConfig';
import { useCreateRsvp, useRsvp, useUpdateRsvp } from '@/hooks/useRsvps';
import { type AttendingStatus, computeHasUnansweredSessions, useRsvpSessionQuestions } from '@/hooks/useRsvpSessionQuestions';
import { ApiError } from '@/lib/api/client';
import { isModuleNotAvailableError } from '@/lib/api/errors';
import type { AttendanceStatus, EventModuleResponseDto, EventStatus, RsvpPlusOnes } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';

// The guest RSVP form for one member: their own on the RSVP page, or a demo
// persona's when an admin fills it in (a host may answer for any member).
export function useRsvpForm({
    eventId,
    eventStatus,
    modules,
    memberId,
    rsvpId,
    isAvailable,
    initialAttending = null,
}: {
    eventId: string | null;
    eventStatus: EventStatus | null | undefined;
    modules: EventModuleResponseDto[] | null | undefined;
    memberId: string | null;
    rsvpId: string | null;
    isAvailable: boolean;
    initialAttending?: AttendingStatus | null;
}) {
    const t = useTranslations('RSVPPage');
    const toErrorMessage = useApiErrorMessage();
    const { data: appConfig } = useAppConfig();
    const rsvpConfig = useAppRsvpConfig();
    const minAdultPlusOnes = Math.max(0, (rsvpConfig?.minAdults ?? 1) - 1);
    const maxAdultPlusOnes = Math.max(minAdultPlusOnes, (rsvpConfig?.maxAdults ?? 5) - 1);
    const minChildCount = rsvpConfig?.minChildren ?? 0;
    const maxChildCount = rsvpConfig?.maxChildren ?? 4;
    const maxMessageLength = appConfig?.contentLimits.rsvpNotesMaxLength ?? 500;

    const [attending, setAttending] = useState<AttendingStatus | null>(initialAttending);
    const [message, setMessage] = useState('');
    const [plusOnes, setPlusOnes] = useState<RsvpPlusOnes>({
        adultCount: minAdultPlusOnes,
        childCount: minChildCount,
    });
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sessionAnswersError, setSessionAnswersError] = useState<unknown>(null);

    const { data: existingRsvp, error: existingRsvpError } = useRsvp(isAvailable ? rsvpId : null);
    const isStaleRsvp = existingRsvpError instanceof ApiError && existingRsvpError.status === 404;
    const effectiveRsvpId = isStaleRsvp ? null : rsvpId;
    const hasExistingRsvp = Boolean(existingRsvp && effectiveRsvpId);
    const sessionQuestions = useRsvpSessionQuestions(eventId, modules);
    const hasUnansweredSessions = computeHasUnansweredSessions(attending, sessionQuestions.allAnswered);
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
        setMessage((existingRsvp.notes ?? '').slice(0, maxMessageLength));
    }, [existingRsvp, maxAdultPlusOnes, maxChildCount, maxMessageLength, minAdultPlusOnes, minChildCount]);

    const createRsvp = useCreateRsvp(eventId ?? undefined);
    const updateRsvp = useUpdateRsvp(effectiveRsvpId ?? '', eventId ?? undefined);

    const canSubmitRsvp = isAvailable && isEventWritable(eventStatus);
    const submitError = createRsvp.error ?? updateRsvp.error;
    const submitErrorMessage = submitError
        ? isModuleNotAvailableError(submitError)
            ? t('moduleUnavailable')
            : toErrorMessage(submitError, t('submitError'))
        : sessionAnswersError
          ? toErrorMessage(sessionAnswersError, t('sessionsSubmitError'))
          : null;

    const handleIncrementPlusOnes = useCallback(
        (type: 'adult' | 'child') => () => {
            setPlusOnes((currentPlusOnes) => ({
                adultCount: type === 'adult' ? Math.min(maxAdultPlusOnes, currentPlusOnes.adultCount + 1) : currentPlusOnes.adultCount,
                childCount: type === 'child' ? Math.min(maxChildCount, currentPlusOnes.childCount + 1) : currentPlusOnes.childCount,
            }));
        },
        [maxAdultPlusOnes, maxChildCount],
    );

    const handleDecrementPlusOnes = useCallback(
        (type: 'adult' | 'child') => () => {
            setPlusOnes((currentPlusOnes) => ({
                adultCount: type === 'adult' ? Math.max(minAdultPlusOnes, currentPlusOnes.adultCount - 1) : currentPlusOnes.adultCount,
                childCount: type === 'child' ? Math.max(minChildCount, currentPlusOnes.childCount - 1) : currentPlusOnes.childCount,
            }));
        },
        [minAdultPlusOnes, minChildCount],
    );

    const handleSubmit = useCallback(
        async (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();

            if (isSubmitting) {
                return;
            }

            if (!attending || !memberId || !canSubmitRsvp || hasUnansweredSessions) {
                return;
            }

            const attendanceStatus: AttendanceStatus = attending === 'attending' ? 'ATTENDING' : 'DECLINED';
            // A decline has no party size of its own — plusOnes may still hold values left
            // over from switching away from "attending", so they must not leak into the count.
            const adultCount = attendanceStatus === 'ATTENDING' ? 1 + plusOnes.adultCount : 1;
            const childCount = attendanceStatus === 'ATTENDING' ? plusOnes.childCount : 0;

            setSessionAnswersError(null);
            setIsSubmitting(true);
            try {
                const rsvp = effectiveRsvpId
                    ? await updateRsvp.mutateAsync({
                          attendanceStatus,
                          adultCount,
                          childCount,
                          notes: message || undefined,
                      })
                    : await createRsvp.mutateAsync({
                          eventMemberId: memberId,
                          attendanceStatus,
                          adultCount,
                          childCount,
                          notes: message || undefined,
                          submittedAt: new Date().toISOString(),
                      });
                // Guests who decline skip the per-session questions.
                if (attendanceStatus === 'ATTENDING') {
                    try {
                        await sessionQuestions.submitAnswers(rsvp.id);
                    } catch (error) {
                        setSessionAnswersError(error);
                        return;
                    }
                }
            } catch {
                return;
            } finally {
                setIsSubmitting(false);
            }

            setSubmitted(true);
        },
        [
            attending,
            canSubmitRsvp,
            createRsvp,
            effectiveRsvpId,
            hasUnansweredSessions,
            isSubmitting,
            memberId,
            message,
            plusOnes.adultCount,
            plusOnes.childCount,
            sessionQuestions,
            updateRsvp,
        ],
    );

    const handleAttend = useCallback(() => setAttending('attending'), []);
    const handleDecline = useCallback(() => setAttending('not-attending'), []);
    const handleMessageChange = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(event.target.value.slice(0, maxMessageLength)),
        [maxMessageLength],
    );

    return {
        attending,
        canSubmitRsvp,
        hasExistingRsvp,
        hasUnansweredSessions,
        isStaleRsvp,
        isSubmitting,
        memberId,
        message,
        maxMessageLength,
        onAttend: handleAttend,
        onDecline: handleDecline,
        onDecrementPlusOnes: handleDecrementPlusOnes,
        onIncrementPlusOnes: handleIncrementPlusOnes,
        onMessageChange: handleMessageChange,
        onSubmit: handleSubmit,
        plusOnes,
        sessionAnswersError,
        sessionQuestions: sessionQuestions.questions,
        onSessionAnswer: sessionQuestions.onAnswer,
        submitErrorMessage,
        submitted,
    };
}

export type RsvpFormState = ReturnType<typeof useRsvpForm>;
