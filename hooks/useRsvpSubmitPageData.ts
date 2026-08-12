import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAppRsvpConfig } from '@/hooks/useAppConfig';
import { useCreateRsvp, useRsvp, useUpdateRsvp } from '@/hooks/useRsvps';
import { ApiError } from '@/lib/api/client';
import { getErrorMessage, isModuleNotAvailableError } from '@/lib/api/errors';
import type { AttendanceStatus, RsvpPlusOnes } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';
import { rsvpStorageKey } from '@/lib/storageKeys';
import { useActiveEvent, useActiveMember, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

export type AttendingStatus = 'attending' | 'not-attending';

export function useRsvpSubmitPageData() {
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
        [attending, canSubmitRsvp, createRsvp, effectiveRsvpId, memberId, message, plusOnes.adultCount, plusOnes.childCount, updateRsvp]
    );

    return {
        attending,
        canSubmitRsvp,
        isSubmitting,
        memberId,
        message,
        onAttend: () => setAttending('attending' as const),
        onBackToWall: handleBackToWall,
        onDecline: () => setAttending('not-attending' as const),
        onDecrementPlusOnes: handleDecrementPlusOnes,
        onGoBack: handleGoBack,
        onIncrementPlusOnes: handleIncrementPlusOnes,
        onMessageChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(event.target.value),
        onSubmit: handleSubmit,
        plusOnes,
        submitErrorMessage,
        submitted,
    };
}
