'use client';

import type React from 'react';
import { useEffect, useState } from 'react';

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useCreateWishbookEntry } from '@/hooks/useWishbook';

const SENT_NOTE_MS = 5000;

type Options = {
    eventId: string;
    // Undefined lets the backend sign the wish (a demo builder posts as someone else).
    guestName: string | undefined;
    maxMessageLength: number;
};

// The in-app write form: text, a recording, or both.
export function useWishComposer({ eventId, guestName, maxMessageLength }: Options) {
    const createEntry = useCreateWishbookEntry(eventId);
    const recorder = useVoiceRecorder();
    const [message, setMessage] = useState('');
    const [showSent, setShowSent] = useState(false);

    useEffect(() => {
        if (!showSent) return;
        const timeout = setTimeout(() => setShowSent(false), SENT_NOTE_MS);
        return () => clearTimeout(timeout);
    }, [showSent]);

    const trimmed = message.trim();
    const audio = recorder.status === 'recorded' ? (recorder.recording?.blob ?? null) : null;
    const canSend = (trimmed !== '' || audio !== null) && recorder.status !== 'recording' && !createEntry.isPending;

    function changeMessage(event: React.ChangeEvent<HTMLTextAreaElement>) {
        setMessage(event.target.value.slice(0, maxMessageLength));
    }

    async function submit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSend) return;
        setShowSent(false);
        try {
            await createEntry.mutateAsync({ message: trimmed, guestName, audio });
        } catch {
            // createEntry.error shows under the form; the text and the recording stay for another try.
            return;
        }
        setMessage('');
        recorder.discard();
        setShowSent(true);
    }

    return {
        message,
        changeMessage,
        recorder,
        canSend,
        isSending: createEntry.isPending,
        sendError: createEntry.error,
        showSent,
        submit,
    };
}

export type WishComposerState = ReturnType<typeof useWishComposer>;
