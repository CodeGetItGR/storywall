'use client';

import { useState } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';

// The settings sheet's switches: start from the saved choice (off when there
// is none) each time the sheet opens, and are saved only on Save.
export function useCookieSettingsDraft() {
    const { consent, settingsOpen, save, closeSettings } = useCookieConsent();
    const savedAds = consent?.ads === true;
    const savedAnalytics = consent?.analytics === true;
    const [ads, setAds] = useState(savedAds);
    const [analytics, setAnalytics] = useState(savedAnalytics);
    const [wasOpen, setWasOpen] = useState(settingsOpen);

    // Reset during render when the sheet opens, so it never shows a stale draft.
    if (settingsOpen !== wasOpen) {
        setWasOpen(settingsOpen);
        if (settingsOpen) {
            setAds(savedAds);
            setAnalytics(savedAnalytics);
        }
    }

    return {
        open: settingsOpen,
        ads,
        setAds,
        analytics,
        setAnalytics,
        saveDraft: () => save({ ads, analytics }),
        close: closeSettings,
    };
}
