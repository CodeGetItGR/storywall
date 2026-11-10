'use client';

import { type SubmitEvent, useState } from 'react';

import type { InvitationLabels } from '@/lib/invitation/labels';
import { readRsvpForm, type RsvpFormProblem, type RsvpSender } from '@/lib/invitation/rsvp';

type RsvpStatus = { message: string; ok: boolean } | null;

const problemLabel: Record<RsvpFormProblem, keyof InvitationLabels> = {
    'name-missing': 'rsvpNameMissing',
    'phone-missing': 'rsvpPhoneMissing',
    'phone-invalid': 'rsvpPhoneInvalid',
};

// The page reloads to show that the invitation is gone. Its own function so tests can watch it.
export const rsvpPage = { reload: () => window.location.reload() };

// The invitation's RSVP form: who is attending, and sending the reply.
export function useInvitationRsvp(send: RsvpSender | undefined, labels: InvitationLabels) {
    const [attending, setAttending] = useState(true);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [status, setStatus] = useState<RsvpStatus>(null);

    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const result = readRsvpForm(new FormData(event.currentTarget));
        if ('problem' in result) {
            setStatus({ message: labels[problemLabel[result.problem]], ok: false });
            return;
        }

        setSending(true);
        setStatus({ message: labels.rsvpSending, ok: true });
        try {
            // Without a sender (the preview) nothing is saved, and the guest still sees the thanks.
            const outcome = send ? await send(result.reply) : ({ ok: true } as const);
            if (outcome.ok) setSent(true);
            else if ('reload' in outcome) rsvpPage.reload();
            else setStatus({ message: outcome.message, ok: false });
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
