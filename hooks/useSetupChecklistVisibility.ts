'use client';

import { useEffect, useState } from 'react';

const COMPLETED_VISIT_LIMIT = 3;

export function useSetupChecklistVisibility(eventId: string, checklistKey: string, isComplete: boolean, isLoading: boolean) {
    const [showCompletedChecklist, setShowCompletedChecklist] = useState(true);

    useEffect(() => {
        if (isLoading) return;

        const storageKey = `storywall:setup-checklist:${eventId}:${checklistKey}:complete-visits`;

        if (!isComplete) {
            localStorage.removeItem(storageKey);
            queueMicrotask(() => setShowCompletedChecklist(true));
            return;
        }

        const completedVisits = Number(localStorage.getItem(storageKey) ?? '0') + 1;
        localStorage.setItem(storageKey, String(completedVisits));
        queueMicrotask(() => setShowCompletedChecklist(completedVisits <= COMPLETED_VISIT_LIMIT));
    }, [checklistKey, eventId, isComplete, isLoading]);

    return !isComplete || showCompletedChecklist;
}
