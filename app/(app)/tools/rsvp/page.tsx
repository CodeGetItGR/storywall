'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

import { GuestList, RsvpForm, RsvpHeader, RsvpSubmittedView } from '@/components/rsvp';
import { useEventMembers } from '@/hooks/useEventMembers';
import { useCreateRsvp, useEventRsvps, useRsvp, useUpdateRsvp } from '@/hooks/useRsvps';
import type { AttendanceStatus } from '@/lib/api/types';
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
        presetAttending === 'attending' || presetAttending === 'not-attending' ? presetAttending : null
    );
    const [dietary, setDietary] = useState('');
    const [message, setMessage] = useState('');
    const [plusOnes, setPlusOnes] = useState(0);
    const [submitted, setSubmitted] = useState(false);

    const [rsvpId, setRsvpId] = useState<string | null>(() => (memberId ? localStorage.getItem(rsvpStorageKey(memberId)) : null));

    // Re-read localStorage synchronously during render when memberId changes,
    // instead of via an effect (see react.dev/learn/you-might-not-need-an-effect).
    const [prevMemberId, setPrevMemberId] = useState(memberId);
    if (memberId !== prevMemberId) {
        setPrevMemberId(memberId);
        setRsvpId(memberId ? localStorage.getItem(rsvpStorageKey(memberId)) : null);
    }

    const { data: existingRsvp } = useRsvp(rsvpId);

    // Server data is the source of truth for an already-submitted RSVP, but it
    // arrives after mount — hydrate the form once it loads without clobbering
    // whatever the guest has already started typing.
    const hydratedRef = useRef(false);
    useEffect(() => {
        if (!existingRsvp || hydratedRef.current) return;
        hydratedRef.current = true;
        setAttending(existingRsvp.attendanceStatus === 'ATTENDING' ? 'attending' : 'not-attending');
        setPlusOnes(Math.max(0, existingRsvp.adultCount - 1));
        setDietary(existingRsvp.dietaryNotes ?? '');
        setMessage(existingRsvp.notes ?? '');
    }, [existingRsvp]);

    const createRsvp = useCreateRsvp(eventId ?? undefined);
    const updateRsvp = useUpdateRsvp(rsvpId ?? '', eventId ?? undefined);

    // Only HOST members can list every guest's RSVP — attendees only ever see
    // their own via useRsvp above, so skip this fetch (and the guest list) for
    // everyone else.
    const { data: eventRsvps } = useEventRsvps(isHost ? eventId : null);
    const { data: eventMembers } = useEventMembers(isHost ? eventId : null);
    const memberNames = new Map((eventMembers ?? []).map((m) => [m.id, m.displayName]));
    const confirmedGuests = (eventRsvps ?? [])
        .filter((r) => r.attendanceStatus === 'ATTENDING')
        .map((r) => ({ ...r, name: memberNames.get(r.eventMemberId) ?? r.eventMemberId }));

    const isSubmitting = createRsvp.isPending || updateRsvp.isPending;
    const submitError = createRsvp.error ?? updateRsvp.error;

    function handleGoBack() {
        router.back();
    }

    function handleBackToWall() {
        router.push('/feed');
    }

    function handleAttend() {
        setAttending('attending');
    }

    function handleDecline() {
        setAttending('not-attending');
    }

    function handleIncrementPlusOnes() {
        setPlusOnes((p) => Math.min(4, p + 1));
    }

    function handleDecrementPlusOnes() {
        setPlusOnes((p) => Math.max(0, p - 1));
    }

    function handleDietaryChange(e: React.ChangeEvent<HTMLSelectElement>) {
        setDietary(e.target.value);
    }

    function handleMessageChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        setMessage(e.target.value);
    }

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!attending || !memberId) return;

        const attendanceStatus: AttendanceStatus = attending === 'attending' ? 'ATTENDING' : 'DECLINED';
        const adultCount = 1 + plusOnes;

        if (rsvpId) {
            await updateRsvp.mutateAsync({
                attendanceStatus,
                adultCount,
                childCount: 0,
                dietaryNotes: dietary || undefined,
                notes: message || undefined,
            });
        } else {
            const created = await createRsvp.mutateAsync({
                eventMemberId: memberId,
                attendanceStatus,
                adultCount,
                childCount: 0,
                dietaryNotes: dietary || undefined,
                notes: message || undefined,
                submittedAt: new Date().toISOString(),
            });
            setRsvpId(created.id);
            localStorage.setItem(rsvpStorageKey(memberId), created.id);
        }

        setSubmitted(true);
    }

    if (submitted) {
        return (
            <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
                <RsvpHeader onGoBack={handleGoBack} />
                <RsvpSubmittedView attending={attending} onBackToWall={handleBackToWall} />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
            <RsvpHeader onGoBack={handleGoBack} />

            <RsvpForm
                attending={attending}
                onAttend={handleAttend}
                onDecline={handleDecline}
                plusOnes={plusOnes}
                onIncrementPlusOnes={handleIncrementPlusOnes}
                onDecrementPlusOnes={handleDecrementPlusOnes}
                dietary={dietary}
                onDietaryChange={handleDietaryChange}
                message={message}
                onMessageChange={handleMessageChange}
                onSubmit={handleSubmit}
                submitDisabled={!attending || !memberId || isSubmitting}
                submitError={submitError !== null && submitError !== undefined}
            />

            {isHost && confirmedGuests.length > 0 && <GuestList guests={confirmedGuests} />}
        </div>
    );
}
