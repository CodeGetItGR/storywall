'use client';

import { useCallback, useState } from 'react';

import { useOverlayHistory } from '@/hooks/useOverlayHistory';
import type { QrLandingView } from '@/hooks/useQrLanding';
import type { QrLandingChoice } from '@/lib/qrLanding';

// Which form a scanned code's page shows over its choices, and its sent screen.
// A form opened from the choices is its own Back step: the phone's Back closes it,
// like the in-app back arrow, instead of leaving the page.
export function useQrLandingForm(startView: QrLandingView | null) {
    const [chosen, setChosen] = useState<QrLandingView | null>(null);
    // The form's sent screen stands on its own, without the back arrow and section label above it.
    const [isSent, setIsSent] = useState(false);

    const choose = useCallback((choice: QrLandingChoice) => {
        if (choice === 'upload' || choice === 'wish') setChosen(choice);
    }, []);

    const showChoices = useCallback(() => {
        setChosen('chooser');
        setIsSent(false);
    }, []);

    const isFormOverChoices = startView === 'chooser' && (chosen === 'upload' || chosen === 'wish');
    const { requestClose: closeForm } = useOverlayHistory(isFormOverChoices, showChoices);

    return { chosen, choose, closeForm, isSent, setIsSent };
}
