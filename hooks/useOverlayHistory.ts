'use client';

import { useCallback, useEffect, useId, useRef } from 'react';

import { type OverlayHistoryRegistration, registerOverlayHistory } from '@/lib/overlayHistory';

export function useOverlayHistory(open: boolean, onClose: () => void, enabled = true) {
    const layerId = useId();
    const onCloseRef = useRef(onClose);
    const registrationRef = useRef<OverlayHistoryRegistration | null>(null);
    const openRef = useRef(open);
    const enabledRef = useRef(enabled);

    useEffect(() => {
        onCloseRef.current = onClose;
        openRef.current = open;
        enabledRef.current = enabled;
    }, [enabled, onClose, open]);

    useEffect(() => {
        if (!open || !enabled) return;

        let cancelled = false;

        // Deferring registration prevents React's development effect replay
        // from creating a throwaway history entry before the real setup.
        queueMicrotask(() => {
            if (cancelled) return;

            registrationRef.current = registerOverlayHistory({
                id: layerId,
                onClose: () => onCloseRef.current(),
            });
        });

        return () => {
            cancelled = true;
            registrationRef.current?.remove();
            registrationRef.current = null;
        };
    }, [enabled, layerId, open]);

    const requestClose = useCallback(() => {
        if (!enabledRef.current || !openRef.current) {
            onCloseRef.current();
            return;
        }

        const registration = registrationRef.current;
        if (registration) {
            registration.requestClose();
            return;
        }

        onCloseRef.current();
    }, []);

    return { requestClose };
}
