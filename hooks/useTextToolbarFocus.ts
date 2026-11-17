'use client';

import { type KeyboardEvent, useCallback, useRef } from 'react';

const CONTROLS = 'button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])';

function firstControl(toolbar: HTMLElement | null): HTMLElement | null {
    return toolbar?.querySelector<HTMLElement>(CONTROLS) ?? null;
}

// The toolbar comes next after the open text for the keyboard, though it sits after the
// whole canvas on the page: Tab or Alt+F10 in the text goes to it, and Shift+Tab on its
// first control goes back to the text.
export function useTextToolbarFocus(text: HTMLElement | null) {
    const toolbarRef = useRef<HTMLDivElement>(null);

    const focusToolbar = useCallback(() => {
        const first = firstControl(toolbarRef.current);
        first?.focus();
        return first !== null;
    }, []);

    const onToolbarKeyDown = useCallback(
        (event: KeyboardEvent<HTMLElement>) => {
            if (event.key !== 'Tab' || !event.shiftKey || !text || event.target !== firstControl(toolbarRef.current)) return;
            event.preventDefault();
            text.focus();
        },
        [text],
    );

    return { toolbarRef, focusToolbar, onToolbarKeyDown };
}
