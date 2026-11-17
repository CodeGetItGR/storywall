'use client';

import { type ChangeEvent, type FocusEvent, useCallback, useState } from 'react';

import { documentLink } from '@/lib/invitation/documentLink';

type SettingsTextFieldOptions = {
    // Checks the field as a link: a bare domain gets https://, anything else that isn't a link is refused.
    isLink?: boolean;
};

// A text or link setting typed in full and saved when the field is left.
// What's typed stays put until then; an undo shows the stored value again.
export function useSettingsTextField(value: string, onSave: (value: string) => void, { isLink = false }: SettingsTextFieldOptions = {}) {
    const [draft, setDraft] = useState(value);
    const [stored, setStored] = useState(value);
    const [isInvalid, setIsInvalid] = useState(false);

    // The stored value changed from outside (an undo): show it.
    if (stored !== value) {
        setStored(value);
        setDraft(value);
        setIsInvalid(false);
    }

    const onChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setDraft(event.target.value);
        setIsInvalid(false);
    }, []);

    // Reads the field itself, so a leave right after typing checks what was typed.
    const onBlur = useCallback(
        (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const typed = event.target.value;
            const next = isLink ? documentLink(typed) : typed;
            if (next === null) {
                setIsInvalid(true);
                return;
            }
            setDraft(next);
            if (next !== value) onSave(next);
        },
        [isLink, onSave, value],
    );

    return { value: draft, onChange, onBlur, isInvalid };
}
