'use client';

import { useLocale } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import type { useQrLanding } from '@/hooks/useQrLanding';
import { useEventQrLinks } from '@/hooks/useQrLinks';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { demoQrNoticeKey, demoQrResolution } from '@/lib/demo/demoQrLanding';
import type { DemoGuestPage } from '@/lib/demo/demoRouting';
import { type QrLandingChoice, qrLandingPlan, qrLandingStart, resolveQrLandingToken } from '@/lib/qrLanding';
import { routes } from '@/lib/routes';
import { useActiveEvent } from '@/providers/EventProvider';

type QrLandingView = 'chooser' | 'upload' | 'wish';

// The demo's stand-in for useQrLanding: the same page a scanned code opens, seen as a guest without an
// account. The demo visitor is the host, so the plan is built for a guest rather than from their membership.
export function useDemoQrLanding(page: DemoGuestPage) {
    const event = useActiveEvent();
    const locale = useLocale() as Locale;
    const { data: qrLinks, isLoading } = useEventQrLinks(event?.id ?? null);

    const scanned = useMemo(() => (event && qrLinks ? demoQrResolution(event, qrLinks, page) : null), [event, qrLinks, page]);
    const resolution = scanned?.resolution;
    const plan = useMemo(() => qrLandingPlan(resolution, { isMember: false, hasWishbook: false }), [resolution]);
    const start = qrLandingStart(plan);
    const startView: QrLandingView | null = start === 'upload' || start === 'wish' || start === 'chooser' ? start : null;

    const [chosen, setChosen] = useState<QrLandingView | null>(null);
    const [isSent, setIsSent] = useState(false);
    const view = chosen ?? startView;

    const choose = useCallback((choice: QrLandingChoice) => {
        if (choice === 'upload' || choice === 'wish') setChosen(choice);
    }, []);
    const back = useCallback(() => {
        setChosen('chooser');
        setIsSent(false);
    }, []);

    const scannedToken = scanned?.token ?? '';
    const landing: ReturnType<typeof useQrLanding> = {
        resolution,
        error: null,
        isLoading,
        plan,
        eventId: event?.id ?? null,
        isSignedIn: false,
        view,
        choose,
        back,
        isSent,
        setIsSent,
        canGoBack: startView === 'chooser' && view !== 'chooser',
        uploadToken: resolveQrLandingToken(plan.uploadToken, scannedToken),
        wishToken: resolveQrLandingToken(plan.wishToken, scannedToken),
        member: null,
    };

    return {
        landing,
        // No working code to scan, or nothing it offers.
        isUnavailable: !isLoading && plan.choices.length === 0,
        noticeKey: isSent ? null : demoQrNoticeKey(view),
        plansHref: `${getPublicLandingPath(locale)}#pricing`,
        demoHref: event ? routes.events.feed(event.id) : null,
    };
}
