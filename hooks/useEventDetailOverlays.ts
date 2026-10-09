'use client';

import { useCallback, useState } from 'react';

// The one drawer or confirmation the event page has open, with what it acts on.
export type EventOverlay =
    | { kind: 'storage' }
    | { kind: 'members' }
    | { kind: 'plan' }
    | { kind: 'grantModule'; moduleKey: string }
    | { kind: 'revokeModule'; moduleKey: string }
    | { kind: 'removeAddon'; code: string; name: string }
    | { kind: 'suspend' }
    | { kind: 'close' }
    | { kind: 'lift' };

type OverlayState = { overlay: EventOverlay | null; open: boolean; openCount: number };

// The last overlay stays set after it closes, so a drawer keeps its content while it slides out.
// openCount keys the forms, so each opening starts from the event as it is now.
export function useEventDetailOverlays() {
    const [state, setState] = useState<OverlayState>({ overlay: null, open: false, openCount: 0 });

    const show = useCallback((overlay: EventOverlay) => setState((current) => ({ overlay, open: true, openCount: current.openCount + 1 })), []);
    const close = useCallback(() => setState((current) => ({ ...current, open: false })), []);
    const isOpen = useCallback((kind: EventOverlay['kind']) => state.open && state.overlay?.kind === kind, [state]);

    const openStorage = useCallback(() => show({ kind: 'storage' }), [show]);
    const openMembers = useCallback(() => show({ kind: 'members' }), [show]);
    const openPlan = useCallback(() => show({ kind: 'plan' }), [show]);
    const openSuspend = useCallback(() => show({ kind: 'suspend' }), [show]);
    const openClose = useCallback(() => show({ kind: 'close' }), [show]);
    const openLift = useCallback(() => show({ kind: 'lift' }), [show]);
    const openGrantModule = useCallback((moduleKey: string) => show({ kind: 'grantModule', moduleKey }), [show]);
    const openRevokeModule = useCallback((moduleKey: string) => show({ kind: 'revokeModule', moduleKey }), [show]);
    const openRemoveAddon = useCallback((code: string, name: string) => show({ kind: 'removeAddon', code, name }), [show]);

    return {
        overlay: state.overlay,
        openCount: state.openCount,
        isOpen,
        close,
        openStorage,
        openMembers,
        openPlan,
        openSuspend,
        openClose,
        openLift,
        openGrantModule,
        openRevokeModule,
        openRemoveAddon,
    };
}

export type EventDetailOverlays = ReturnType<typeof useEventDetailOverlays>;
