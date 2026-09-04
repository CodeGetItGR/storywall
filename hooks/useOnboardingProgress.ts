'use client';

import { useCallback, useEffect, useState } from 'react';

// Per-event, per-device progress for the host onboarding wizard.
// Local only for now — no backend field exists yet to persist this across
// devices. Swap the storage calls below for an API call if that lands later;
// nothing outside this hook needs to know where the state lives.
interface OnboardingState {
    completed: boolean;
    stepIndex: number;
    dismissed: boolean;
}

function storageKey(eventId: string) {
    return `onboarding:${eventId}`;
}

function readState(eventId: string): OnboardingState {
    try {
        const raw = window.localStorage.getItem(storageKey(eventId));
        if (!raw) return { completed: false, stepIndex: 0, dismissed: false };
        const parsed = JSON.parse(raw) as Partial<OnboardingState>;
        const stepIndex = typeof parsed.stepIndex === 'number' && parsed.stepIndex >= 0 ? parsed.stepIndex : 0;
        return { completed: Boolean(parsed.completed), stepIndex, dismissed: Boolean(parsed.dismissed) };
    } catch {
        return { completed: false, stepIndex: 0, dismissed: false };
    }
}

function writeState(eventId: string, state: OnboardingState) {
    try {
        window.localStorage.setItem(storageKey(eventId), JSON.stringify(state));
    } catch {
        // Best-effort — worst case the guide resets next visit.
    }
}

export function useOnboardingProgress(eventId: string | null) {
    const [state, setState] = useState<OnboardingState>({ completed: true, stepIndex: 0, dismissed: false });
    const [isOpen, setIsOpen] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        if (!eventId) return;
        const stored = readState(eventId);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(stored);
        setIsOpen(false);
        setHydrated(true);
    }, [eventId]);

    // Only persists once `state` has settled to a value read from storage on
    // this render pass — writing during the same effect flush that hydrates
    // would still see the pre-hydration default and clobber storage with it.
    useEffect(() => {
        if (!eventId || !hydrated) return;
        writeState(eventId, state);
    }, [eventId, state, hydrated]);

    const open = useCallback(() => setIsOpen(true), []);

    const openAt = useCallback((stepIndex: number) => {
        setState((current) => ({ ...current, completed: false, stepIndex: Math.max(stepIndex, 0) }));
        setIsOpen(true);
    }, []);

    // Closes the wizard without marking it done, so it can be reopened later
    // at the same step (e.g. a mistaken skip, or "back later"). Dismissing
    // from the final step is treated as a deliberate "I'm done with this"
    // and permanently suppresses the wizard (including its launcher) for
    // this event, even if other setup conditions are still unmet.
    const dismiss = useCallback((permanent = false) => {
        setIsOpen(false);
        setState((current) => ({ ...current, completed: false, dismissed: permanent || current.dismissed }));
    }, []);

    // Finishing the last step ("Let's go") is itself a final-step dismissal —
    // it must suppress the launcher too, not just close the modal.
    const complete = useCallback(() => {
        setIsOpen(false);
        setState({ completed: true, stepIndex: 0, dismissed: true });
    }, []);

    // stepCount can transiently be 0 if the caller derived it from data that
    // hadn't loaded yet on that render — ignore the advance rather than
    // driving stepIndex negative and desyncing from the actual step list.
    const next = useCallback((stepCount: number) => {
        if (stepCount <= 0) return;
        setState((current) => ({ ...current, stepIndex: Math.min(current.stepIndex + 1, stepCount - 1) }));
    }, []);

    const back = useCallback(() => {
        setState((current) => ({ ...current, stepIndex: Math.max(current.stepIndex - 1, 0) }));
    }, []);

    return {
        isOpen: Boolean(eventId) && isOpen,
        isComplete: state.completed,
        isDismissed: state.dismissed,
        stepIndex: state.stepIndex,
        open,
        openAt,
        next,
        back,
        dismiss,
        complete,
    };
}
