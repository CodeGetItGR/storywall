'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { GuestList, RsvpForm, RsvpHeader, RsvpSubmittedView } from '@/components/rsvp';
import { useEventMembers } from '@/hooks/useEventMembers';
import { useCreateRsvp, useEventRsvps, useRsvp, useUpdateRsvp } from '@/hooks/useRsvps';
import { AttendanceStatus, RsvpPlusOnes } from '@/lib/api/types';
import { useActiveEvent, useActiveMember, useIsHost } from '@/providers/EventProvider';

type AttendingStatus = 'attending' | 'not-attending';

function rsvpStorageKey(memberId: string) {
    return `storywall.rsvpId.${memberId}`;
}

export default function RSVPPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const eventId = activeEvent?.id ?? null;
    const memberId = activeMember?.id ?? null;
    const isHost = useIsHost();

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

    const [rsvpId, setRsvpId] = useState<string | null>(() =>
        memberId ? localStorage.getItem(rsvpStorageKey(memberId)) : null
    );

    const [prevMemberId, setPrevMemberId] = useState(memberId);

    if (memberId !== prevMemberId) {
        setPrevMemberId(memberId);
        setRsvpId(memberId ? localStorage.getItem(rsvpStorageKey(memberId)) : null);
    }

    const { data: existingRsvp } = useRsvp(rsvpId);

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

    const createRsvp = useCreateRsvp(eventId ?? undefined);
    const updateRsvp = useUpdateRsvp(rsvpId ?? '', eventId ?? undefined);

    const { data: eventRsvps } = useEventRsvps(isHost ? eventId : null);
    const { data: eventMembers } = useEventMembers(isHost ? eventId : null);

    const memberNames = new Map(
        (eventMembers ?? []).map((member) => [member.id, member.displayName])
    );

    const confirmedGuests = (eventRsvps ?? [])
        .filter((rsvp) => rsvp.attendanceStatus === 'ATTENDING')
        .map((rsvp) => ({
            ...rsvp,
            name: memberNames.get(rsvp.eventMemberId) ?? rsvp.eventMemberId
        }));

    const isSubmitting = createRsvp.isPending || updateRsvp.isPending;
    const submitError = createRsvp.error ?? updateRsvp.error;

    const handleGoBack = useCallback(() => {
        router.back();
    }, [router]);

    const handleBackToWall = useCallback(() => {
        router.push('/feed');
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

            if (rsvpId) {
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

                setRsvpId(created.id);
                localStorage.setItem(rsvpStorageKey(memberId), created.id);
            }

            setSubmitted(true);
        },
        [attending, rsvpId, message, createRsvp, updateRsvp, plusOnes.adultCount, plusOnes.childCount]
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

            {isHost && confirmedGuests.length > 0 && (
                <GuestList guests={confirmedGuests} />
            )}
        </div>
    );
}