'use client';

import { useCallback, useEffect, useId, useRef } from 'react';

const OVERLAY_HISTORY_KEY = '__storywallOverlayStack';

type HistoryStateWithOverlayStack = History['state'] & {
    [OVERLAY_HISTORY_KEY]?: string[];
};

function getOverlayStack(state: History['state']): string[] {
    if (!state || typeof state !== 'object') return [];
    const stack = (state as HistoryStateWithOverlayStack)[OVERLAY_HISTORY_KEY];
    return Array.isArray(stack) ? stack.filter((value): value is string => typeof value === 'string') : [];
}

function pushOverlayHistoryState(layerId: string) {
    const stack = getOverlayStack(window.history.state);
    window.history.pushState(
        {
            ...(window.history.state && typeof window.history.state === 'object' ? window.history.state : {}),
            [OVERLAY_HISTORY_KEY]: [...stack, layerId],
        },
        '',
        window.location.href
    );
}

export function useOverlayRouteHistory(open: boolean, onClose: () => void, enabled = true) {
    const layerId = useId();
    const openRef = useRef(open);
    const enabledRef = useRef(enabled);
    const hasPushedEntryRef = useRef(false);

    useEffect(() => {
        openRef.current = open;
        enabledRef.current = enabled;
    }, [enabled, open]);

    useEffect(() => {
        if (!enabled || !open || hasPushedEntryRef.current) return;

        pushOverlayHistoryState(layerId);
        hasPushedEntryRef.current = true;

        function handlePopState(event: PopStateEvent) {
            if (!enabledRef.current || !openRef.current || !hasPushedEntryRef.current) return;

            const nextStack = getOverlayStack(event.state);
            if (nextStack.includes(layerId)) return;

            hasPushedEntryRef.current = false;
            onClose();
        }

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [enabled, layerId, onClose, open]);

    useEffect(() => {
        if (open || !hasPushedEntryRef.current) return;

        const currentStack = getOverlayStack(window.history.state);
        const isTopLayer = currentStack.at(-1) === layerId;

        hasPushedEntryRef.current = false;

        if (enabled && isTopLayer) {
            window.history.back();
        }
    }, [enabled, layerId, open]);

    const requestClose = useCallback(() => {
        if (!enabledRef.current || !openRef.current) {
            onClose();
            return;
        }

        const currentStack = getOverlayStack(window.history.state);
        const isTopLayer = currentStack.at(-1) === layerId;

        if (hasPushedEntryRef.current && isTopLayer) {
            window.history.back();
            return;
        }

        hasPushedEntryRef.current = false;
        onClose();
    }, [layerId, onClose]);

    return { requestClose };
}
