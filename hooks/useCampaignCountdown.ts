'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';

import { useCountdown } from '@/hooks/useCountdown';
import { formatDate } from '@/lib/datetime';

const ENDS_ON_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };

function subscribeToNothing() {
    return () => undefined;
}

function isMountedOnClient() {
    return true;
}

function isMountedOnServer() {
    return false;
}

// The campaign's remaining time, ticking every second, and its end date for screen readers. Hidden
// until mounted: the server's clock would differ from the browser's and break hydration.
export function useCampaignCountdown(endsAt: string) {
    const t = useTranslations('SiteNotice');
    const locale = useLocale();
    const { days, hours, minutes, seconds, hasFinished } = useCountdown(Date.parse(endsAt));
    const mounted = useSyncExternalStore(subscribeToNothing, isMountedOnClient, isMountedOnServer);

    const countdown =
        days > 0
            ? t('countdownDays', { days, hours, minutes })
            : hours > 0
              ? t('countdownHours', { hours, minutes })
              : t('countdownMinutes', { minutes, seconds });

    return {
        visible: mounted && !hasFinished,
        endsIn: t('campaignEndsIn', { countdown }),
        endsOn: t('campaignEndsOn', { date: formatDate(locale, endsAt, ENDS_ON_FORMAT) }),
    };
}
