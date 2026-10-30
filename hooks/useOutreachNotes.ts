'use client';

import { type ChangeEvent, type SubmitEvent, useCallback, useState } from 'react';

import { useAddOutreachNote } from '@/hooks/useAdminOutreach';

export function useOutreachNotes(prospectId: string) {
    const add = useAddOutreachNote();
    const [body, setBody] = useState('');
    const canSubmit = body.trim().length > 0 && !add.isPending;

    const handleBodyChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setBody(event.target.value), []);

    const handleSubmit = useCallback(
        (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            const text = body.trim();
            if (!text) return;
            add.mutate({ id: prospectId, body: text }, { onSuccess: () => setBody('') });
        },
        [add, body, prospectId],
    );

    return { body, canSubmit, isSaving: add.isPending, error: add.error, handleBodyChange, handleSubmit };
}
