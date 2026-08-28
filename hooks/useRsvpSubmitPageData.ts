import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig, useAppRsvpConfig } from '@/hooks/useAppConfig';
import { setMemberRsvpIdInCaches, useCreateRsvp, useRsvp, useUpdateRsvp } from '@/hooks/useRsvps';
import { ApiError } from '@/lib/api/client';
import { isModuleNotAvailableError } from '@/lib/api/errors';
import type { AttendanceStatus, RsvpPlusOnes } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';
import { useActiveEvent, useActiveMember, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

export type AttendingStatus = 'attending' | 'not-attending';

export function useRsvpSubmitPageData() {
    const t = useTranslations('RSVPPage');
    const toErrorMessage = useApiErrorMessage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const eventId = activeEvent?.id ?? null;
    const memberId = activeMember?.id ?? null;
    const rsvpId = activeMember?.rsvpId ?? null;
    const isHost = useIsHost();
    const isContextLoading = useEventContextLoading();
    const { data: appConfig } = useAppConfig();
    const rsvpConfig = useAppRsvpConfig();
    const minAdultPlusOnes = Math.max(0, (rsvpConfig?.minAdults ?? 1) - 1);
    const maxAdultPlusOnes = Math.max(minAdultPlusOnes, (rsvpConfig?.maxAdults ?? 5) - 1);
    const minChildCount = rsvpConfig?.minChildren ?? 0;
    const maxChildCount = rsvpConfig?.maxChildren ?? 4;
    const maxMessageLength = appConfig?.contentLimits.rsvpNotesMaxLength ?? 500;

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

    const { data: existingRsvp, error: existingRsvpError } = useRsvp(rsvpId ?? null);
    const isStaleRsvp = existingRsvpError instanceof ApiError && existingRsvpError.status === 404;
    const effectiveRsvpId = isStaleRsvp ? null : rsvpId;
    const hasExistingRsvp = Boolean(existingRsvp && effectiveRsvpId);
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

    useEffect(() => {
        if (!isContextLoading && isHost && eventId) {
            router.replace(routes.events.tools.rsvp(eventId));
        }
    }, [eventId, isContextLoading, isHost, router]);

    useEffect(() => {
        if (!eventId || !memberId || !isStaleRsvp || !rsvpId) {
            return;
        }

        setMemberRsvpIdInCaches(queryClient, memberId, null, eventId);
        router.refresh();
    }, [eventId, isStaleRsvp, memberId, queryClient, rsvpId, router]);

    const createRsvp = useCreateRsvp(eventId ?? undefined);
    const updateRsvp = useUpdateRsvp(effectiveRsvpId ?? '', eventId ?? undefined);

    const isSubmitting = createRsvp.isPending || updateRsvp.isPending;
    const canSubmitRsvp = isEventWritable(activeEvent?.status);
    const submitError = createRsvp.error ?? updateRsvp.error;
    const submitErrorMessage = submitError
        ? isModuleNotAvailableError(submitError)
            ? t('moduleUnavailable')
            : toErrorMessage(submitError, t('submitError'))
        : null;

    const handleGoBack = useCallback(() => {
        router.back();
    }, [router]);

    const handleBackToWall = useCallback(() => {
        router.push(routes.feed);
    }, [router]);

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
                    await createRsvp.mutateAsync({
                        eventMemberId: memberId,
                        attendanceStatus,
                        adultCount,
                        childCount,
                        notes: message || undefined,
                        submittedAt: new Date().toISOString(),
                    });
                }
            } catch {
                return;
            }

            setSubmitted(true);
        },
        [attending, canSubmitRsvp, createRsvp, effectiveRsvpId, memberId, message, plusOnes.adultCount, plusOnes.childCount, updateRsvp]
    );

    return {
        attending,
        canSubmitRsvp,
        eventType: activeEvent?.eventType ?? null,
        hasExistingRsvp,
        isSubmitting,
        memberId,
        message,
        maxMessageLength,
        onAttend: () => setAttending('attending' as const),
        onBackToWall: handleBackToWall,
        onDecline: () => setAttending('not-attending' as const),
        onDecrementPlusOnes: handleDecrementPlusOnes,
        onGoBack: handleGoBack,
        onIncrementPlusOnes: handleIncrementPlusOnes,
        onMessageChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(event.target.value.slice(0, maxMessageLength)),
        onSubmit: handleSubmit,
        plusOnes,
        submitErrorMessage,
        submitted,
    };
}
