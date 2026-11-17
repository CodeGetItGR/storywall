import { useEffect, useRef } from 'react';

// A dialog takes focus when it opens, so Enter can't press a button hidden behind it, and gives focus back when it closes.
export function useDialogFocus<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    useEffect(() => {
        const previous = document.activeElement;
        ref.current?.focus();
        return () => {
            if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
        };
    }, []);
    return ref;
}
