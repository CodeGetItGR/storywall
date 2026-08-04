'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { RsvpForm, RsvpHeader, RsvpSubmittedView } from '@/components/rsvp';
import { useCreateRsvp, useRsvp, useUpdateRsvp } from '@/hooks/useRsvps';
import { ApiError } from '@/lib/api/client';
import { AttendanceStatus, RsvpPlusOnes } from '@/lib/api/types';
import { rsvpStorageKey } from '@/lib/storageKeys';
import { routes } from '@/lib/routes';
import { useActiveEvent, useActiveMember, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

type AttendingStatus = 'attending' | 'not-attending';

export default function RSVPSubmitPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const eventId = activeEvent?.id ?? null;
    const memberId = activeMember?.id ?? null;
    const isHost = useIsHost();
    const isContextLoading = useEventContextLoading();

    const presetAttending = searchParams.get('attending');

    const [attending, setAttending] = useState<AttendingStatus | null>(
        presetAttending === 'attending' || presetAttending === 'not-attending'
            ? presetAttending
            : null
    );
    const [message, setMessage] = useState('');
    const [plusOnes, setPlusOnes] = useState<RsvpPlusOnes>({
        adultCount: 1,
        childCount: 0
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

        setAttending(
            existingRsvp.attendanceStatus === 'ATTENDING'
                ? 'attending'
                : 'not-attending'
        );
        setPlusOnes({
            adultCount: Math.max(1, existingRsvp.adultCount - 1),
            childCount: Math.max(0, existingRsvp.childCount)
        });
        setMessage(existingRsvp.notes ?? '');
    }, [existingRsvp]);

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
    const submitError = createRsvp.error ?? updateRsvp.error;

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

    const handleIncrementPlusOnes = useCallback((type: 'adult' | 'child') => () => {
        setPlusOnes((currentPlusOnes) => ({
            adultCount:
                type === 'adult'
                    ? Math.min(4, currentPlusOnes.adultCount + 1)
                    : currentPlusOnes.adultCount,
            childCount:
                type === 'child'
                    ? Math.min(4, currentPlusOnes.childCount + 1)
                    : currentPlusOnes.childCount
        }));
    }, []);

    const handleDecrementPlusOnes = useCallback((type: 'adult' | 'child') => () => {
        setPlusOnes((currentPlusOnes) => ({
            adultCount:
                type === 'adult'
                    ? Math.max(1, currentPlusOnes.adultCount - 1)
                    : currentPlusOnes.adultCount,
            childCount:
                type === 'child'
                    ? Math.max(0, currentPlusOnes.childCount - 1)
                    : currentPlusOnes.childCount
        }));
    }, []);

    const handleMessageChange = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement>) => {
            setMessage(event.target.value);
        },
        []
    );

    const handleSubmit = useCallback(
        async (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();

            if (!attending || !memberId) {
                return;
            }

            const attendanceStatus: AttendanceStatus =
                attending === 'attending' ? 'ATTENDING' : 'DECLINED';

            const adultCount = 1 + plusOnes.adultCount;
            const childCount = plusOnes.childCount;

            if (effectiveRsvpId) {
                await updateRsvp.mutateAsync({
                    attendanceStatus,
                    adultCount,
                    childCount,
                    notes: message || undefined
                });
            } else {
                const created = await createRsvp.mutateAsync({
                    eventMemberId: memberId,
                    attendanceStatus,
                    adultCount,
                    childCount,
                    notes: message || undefined,
                    submittedAt: new Date().toISOString()
                });

                localStorage.setItem(rsvpStorageKey(memberId), created.id);
            }

            setSubmitted(true);
        },
        [attending, effectiveRsvpId, message, createRsvp, updateRsvp, memberId, plusOnes.adultCount, plusOnes.childCount]
    );

    if (submitted) {
        return (
            <div className="mx-auto max-w-2xl px-4 pb-24 lg:pb-8">
                <RsvpHeader onGoBack={handleGoBack} />
                <RsvpSubmittedView
                    attending={attending}
                    onBackToWall={handleBackToWall}
                />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl px-4 pb-24 lg:pb-8">
            <RsvpHeader onGoBack={handleGoBack} />

            <RsvpForm
                attending={attending}
                onAttend={handleAttend}
                onDecline={handleDecline}
                plusOnes={plusOnes}
                onIncrementPlusOnes={handleIncrementPlusOnes}
                onDecrementPlusOnes={handleDecrementPlusOnes}
                message={message}
                onMessageChange={handleMessageChange}
                onSubmit={handleSubmit}
                submitDisabled={!attending || !memberId || isSubmitting}
                submitError={submitError !== null && submitError !== undefined}
            />

        </div>
    );
}
