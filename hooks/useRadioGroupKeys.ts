'use client';

import type { KeyboardEvent } from 'react';

const STEP_BY_KEY: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

// Arrow keys move the selection inside a role="radiogroup" of buttons and carry
// focus with it, as a native radio group does. Each button needs data-radio-id.
export function useRadioGroupKeys(ids: string[], value: string | null, onChangeAction: (id: string) => void) {
    return (event: KeyboardEvent<HTMLElement>) => {
        const step = STEP_BY_KEY[event.key];
        if (!step || ids.length < 2) return;
        event.preventDefault();

        const current = Math.max(0, ids.indexOf(value ?? ''));
        const next = ids[(current + step + ids.length) % ids.length];
        onChangeAction(next);
        event.currentTarget.querySelector<HTMLElement>(`[data-radio-id="${next}"]`)?.focus();
    };
}
