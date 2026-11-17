'use client';

import { useCallback, useState } from 'react';

import type { ColorScope } from '@/lib/invitation/textEditing';

// The colour popover: which texts the colour goes to, and the full picker behind "More colors".
// It opens on "This text" every time, so a whole-section or whole-invitation change is always a choice.
export function useTextColorPicker(current: string, onPick: (color: string, scope: ColorScope) => void) {
    const [isOpen, setIsOpen] = useState(false);
    const [scope, setScope] = useState<ColorScope>('text');
    // The colour being chosen in the full picker; none while the swatches show.
    const [custom, setCustom] = useState<string | null>(null);

    const onOpenChange = useCallback((open: boolean) => {
        if (open) {
            setScope('text');
            setCustom(null);
        }
        setIsOpen(open);
    }, []);

    const pickSwatch = useCallback(
        (color: string) => {
            onPick(color, scope);
            setIsOpen(false);
        },
        [onPick, scope],
    );

    const showMore = useCallback(() => setCustom(current), [current]);
    const cancelCustom = useCallback(() => setCustom(null), []);
    const applyCustom = useCallback(() => {
        if (custom) onPick(custom, scope);
        setIsOpen(false);
    }, [custom, onPick, scope]);

    return { isOpen, onOpenChange, scope, setScope, custom, setCustom, pickSwatch, showMore, cancelCustom, applyCustom };
}
