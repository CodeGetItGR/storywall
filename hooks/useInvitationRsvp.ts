'use client';

import { type SubmitEvent, useState } from 'react';

import type { InvitationLabels } from '@/lib/invitation/labels';
import { readRsvpForm, type RsvpFormProblem, type RsvpSender } from '@/lib/invitation/rsvp';

type RsvpStatus = { message: string; ok: boolean } | null;

const problemLabel: Record<RsvpFormProblem, keyof InvitationLabels> = {
    'name-missing': 'rsvpNameMissing',
    'phone-missing': 'rsvpPhoneMissing',
    'phone-invalid': 'rsvpPhoneInvalid',
    'sessions-missing': 'rsvpSessionsRequired',
};

// The page reloads to show that the invitation is gone. Its own function so tests can watch it.
export const rsvpPage = { reload: () => window.location.reload() };

type InvitationRsvpOptions = {
    // The sessions the form asks about, by id.
    sessionIds?: readonly string[];
    // The answer picked when the form opens.
    initialAttending?: boolean;
    // Told once the reply is saved.
    onSent?: () => void;
};

// The invitation's RSVP form: who is attending, and sending the reply.
export function useInvitationRsvp(send: RsvpSender | undefined, labels: InvitationLabels, options: InvitationRsvpOptions = {}) {
    const { sessionIds = [], initialAttending = true, onSent } = options;
    const [attending, setAttending] = useState(initialAttending);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [status, setStatus] = useState<RsvpStatus>(null);

    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const result = readRsvpForm(new FormData(event.currentTarget), sessionIds);
        if ('problem' in result) {
            setStatus({ message: labels[problemLabel[result.problem]], ok: false });
            return;
        }

        setSending(true);
        setStatus({ message: labels.rsvpSending, ok: true });
        try {
            // Without a sender (the preview) nothing is saved, and the guest still sees the thanks.
            const outcome = send ? await send(result.reply) : ({ ok: true } as const);
            if (outcome.ok) {
                setSent(true);
                onSent?.();
            } else if ('reload' in outcome) rsvpPage.reload();
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
