'use client';

import { useCallback, useEffect, useState } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import { type Locale, localeCookieMaxAge, localeCookieName } from '@/i18n/config';
import { shouldSuggestTwin } from '@/lib/forBusiness';

const DISMISS_KEY = 'storywall.forBusiness.languageBannerDismissed';

function readDismissed(): boolean {
    try {
        return window.localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
        return false;
    }
}

// Decided after hydration from the browser's languages, so the server HTML
// (what crawlers read) never contains the banner. It waits for a saved cookie
// choice so it never stacks with the cookie banner at the bottom.
export function useLanguageBanner(pageLocale: Locale, target: Locale) {
    const { consent } = useCookieConsent();
    const [suggested, setSuggested] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only reads after hydration
        setDismissed(readDismissed());
        setSuggested(shouldSuggestTwin(pageLocale, navigator.languages ?? []));
    }, [pageLocale]);

    const dismiss = useCallback(() => {
        setDismissed(true);
        try {
            window.localStorage.setItem(DISMISS_KEY, '1');
        } catch {
            // Storage blocked: the banner just shows again next visit.
        }
    }, []);

    // Following the link keeps the next visit to / in that language too, as the switcher does.
    const rememberChoice = useCallback(() => {
        document.cookie = `${localeCookieName}=${encodeURIComponent(target)}; path=/; max-age=${localeCookieMaxAge}; samesite=lax`;
    }, [target]);

    return { visible: !!consent && suggested && !dismissed, dismiss, rememberChoice };
}
