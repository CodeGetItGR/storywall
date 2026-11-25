'use client';

import { useCallback, useState } from 'react';

import type { ColorScope } from '@/lib/invitation/textEditing';

// The colour popover: which texts the colour goes to. It opens on "This text" every time, so a whole-section or
// whole-invitation change is always a choice, and closes once a colour is picked.
export function useTextColorPicker(onPick: (color: string, scope: ColorScope) => void) {
    const [isOpen, setIsOpen] = useState(false);
    const [scope, setScope] = useState<ColorScope>('text');

    const onOpenChange = useCallback((open: boolean) => {
        if (open) setScope('text');
        setIsOpen(open);
    }, []);
    const close = useCallback(() => setIsOpen(false), []);
    const pick = useCallback((color: string) => onPick(color, scope), [onPick, scope]);

    return { isOpen, onOpenChange, close, scope, setScope, pick };
}
