'use client';

import { useState } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';

// The settings sheet's Advertising switch: starts from the saved choice (off
// when there is none) each time the sheet opens, and is saved only on Save.
export function useCookieSettingsDraft() {
    const { consent, settingsOpen, save, closeSettings } = useCookieConsent();
    const saved = consent?.ads === true;
    const [ads, setAds] = useState(saved);
    const [wasOpen, setWasOpen] = useState(settingsOpen);

    // Reset during render when the sheet opens, so it never shows a stale draft.
    if (settingsOpen !== wasOpen) {
        setWasOpen(settingsOpen);
        if (settingsOpen) setAds(saved);
    }

    return { open: settingsOpen, ads, setAds, saveDraft: () => save(ads), close: closeSettings };
}
