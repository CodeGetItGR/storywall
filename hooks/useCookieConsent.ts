'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { clearAdCookies, type Consent, CONSENT_COOKIE, readConsent, writeConsent } from '@/lib/consent';

// The banner, the settings sheet, the footer link and the Google tag sit in
// distant branches, so the choice and the sheet's open state live in one small
// module store instead of a context every page would need to wrap.
const listeners = new Set<() => void>();
let settingsOpen = false;

function notify() {
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// The raw cookie value is a stable snapshot; parsing happens once per change.
function readRawConsent(): string {
    const prefix = `${CONSENT_COOKIE}=`;
    return (
        document.cookie
            .split(';')
            .map((part) => part.trim())
            .find((part) => part.startsWith(prefix)) ?? ''
    );
}

// The server can't see the cookie: undefined means "not known yet", so nothing
// consent-dependent renders until the first client read.
function serverSnapshot(): string | undefined {
    return undefined;
}

function readSettingsOpen() {
    return settingsOpen;
}

function serverSettingsOpen() {
    return false;
}

function saveChoice(ads: boolean) {
    writeConsent(ads);
    if (!ads) clearAdCookies();
    settingsOpen = false;
    notify();
}

export type CookieConsentState = {
    // undefined until the browser has been read, null when no choice is saved.
    consent: Consent | null | undefined;
    settingsOpen: boolean;
    acceptAll: () => void;
    rejectAll: () => void;
    save: (ads: boolean) => void;
    openSettings: () => void;
    closeSettings: () => void;
};

export function useCookieConsent(): CookieConsentState {
    const raw = useSyncExternalStore<string | undefined>(subscribe, readRawConsent, serverSnapshot);
    const isSettingsOpen = useSyncExternalStore(subscribe, readSettingsOpen, serverSettingsOpen);
    // raw changes whenever the cookie does; readConsent does the parsing.
    const consent = useMemo(() => (raw === undefined ? undefined : readConsent()), [raw]);

    const acceptAll = useCallback(() => saveChoice(true), []);
    const rejectAll = useCallback(() => saveChoice(false), []);
    const save = useCallback((ads: boolean) => saveChoice(ads), []);
    const openSettings = useCallback(() => {
        settingsOpen = true;
        notify();
    }, []);
    const closeSettings = useCallback(() => {
        settingsOpen = false;
        notify();
    }, []);

    return { consent, settingsOpen: isSettingsOpen, acceptAll, rejectAll, save, openSettings, closeSettings };
}
