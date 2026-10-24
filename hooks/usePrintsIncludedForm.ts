'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent, SubmitEvent } from 'react';
import { useCallback, useState } from 'react';

import { PRINTS_INCLUDED_MAX } from '@/lib/printPicks';

// The "prints included for the host" field: a whole number from 0 to PRINTS_INCLUDED_MAX.
export function usePrintsIncludedForm({ initial, onSave }: { initial: number; onSave: (count: number) => void }) {
    const t = useTranslations('Vendors.prints');
    const [value, setValue] = useState(String(initial));
    const trimmed = value.trim();
    const canSubmit = /^\d{1,4}$/.test(trimmed);

    const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setValue(event.currentTarget.value);
    }, []);

    const handleSubmit = useCallback(
        (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (canSubmit) onSave(Number(trimmed));
        },
        [canSubmit, onSave, trimmed],
    );

    return {
        value,
        handleChange,
        error: canSubmit ? null : t('includedInvalid', { max: PRINTS_INCLUDED_MAX }),
        canSubmit,
        handleSubmit,
    };
}
