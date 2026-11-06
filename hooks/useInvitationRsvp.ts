'use client';

import { type SubmitEvent, useState } from 'react';

import type { InvitationLabels } from '@/lib/invitation/labels';
import { readRsvpForm, type RsvpSender } from '@/lib/invitation/rsvp';

type RsvpStatus = { message: string; ok: boolean } | null;

// The invitation's RSVP form: who is attending, and sending the reply.
export function useInvitationRsvp(send: RsvpSender | undefined, labels: InvitationLabels) {
    const [attending, setAttending] = useState(true);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [status, setStatus] = useState<RsvpStatus>(null);

    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const result = readRsvpForm(new FormData(event.currentTarget));
        if ('missing' in result) {
            setStatus({ message: result.missing === 'name' ? labels.rsvpNameMissing : labels.rsvpPhoneMissing, ok: false });
            return;
        }

        setSending(true);
        setStatus({ message: labels.rsvpSending, ok: true });
        try {
            await send?.(result.reply);
            setSent(true);
        } catch {
            setStatus({ message: labels.rsvpError, ok: false });
        } finally {
            setSending(false);
        }
    }

    const attend = () => setAttending(true);
    const decline = () => setAttending(false);

    return { attending, attend, decline, sending, sent, status, submit };
}
