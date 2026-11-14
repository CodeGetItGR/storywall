'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useEventModules } from '@/hooks/useEventModules';
import { useMyEvents } from '@/hooks/useMyEvents';
import { useQrLinkResolution } from '@/hooks/useQrLinks';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { hasInAppPrevious } from '@/lib/inAppHistory';
import { type QrLandingChoice, qrLandingChoiceHref, type QrLandingForm, qrLandingPlan, qrLandingStart, resolveQrLandingToken } from '@/lib/qrLanding';
import { routes } from '@/lib/routes';

export type QrLandingView = 'chooser' | QrLandingForm;

// The page a scanned event code opens (KAN-208): the event, then a choice of joining, uploading or
// leaving a wish. One choice opens directly; a choice that lives on another page is followed there.
export function useQrLanding(token: string) {
    const router = useRouter();
    const resolutionQuery = useQrLinkResolution(token);
    const resolution = resolutionQuery.data;
    const isActive = resolution?.status === 'ACTIVE';
    const eventId = isActive ? (resolution.eventId ?? null) : null;

    const { isAuthenticated, isBootstrapping } = useAuth();
    const memberships = useMyEvents();
    const membership = eventId ? (memberships.data?.find((row) => row.eventId === eventId) ?? null) : null;
    const modules = useEventModules(membership ? eventId : null);
    const hasWishbook = isModuleAvailable(modules.data, 'wishbook');

    const isVisitorLoading = isBootstrapping || (isAuthenticated && memberships.isLoading) || (Boolean(membership) && modules.isLoading);
    const plan = useMemo(() => qrLandingPlan(resolution, { isMember: Boolean(membership), hasWishbook }), [resolution, membership, hasWishbook]);
    const start = qrLandingStart(plan);

    // A single choice on another page is followed.
    const redirectPath = isVisitorLoading || !start || start === 'chooser' ? null : qrLandingChoiceHref(start, plan, eventId);

    useEffect(() => {
        if (redirectPath) router.replace(redirectPath);
    }, [redirectPath, router]);

    // The feed's Photos action opens the upload form straight away (?choice=upload).
    const requested = useSearchParams().get('choice') === 'upload' && plan.choices.includes('upload') ? 'upload' : null;
    const [chosen, setChosen] = useState<QrLandingView | null>(null);
    const startView: QrLandingView | null = start === 'upload' || start === 'wish' || start === 'chooser' ? start : null;
    const view: QrLandingView | null = chosen ?? requested ?? startView;

    // The form's sent screen stands on its own, without the back arrow and section label above it.
    const [isSent, setIsSent] = useState(false);

    const choose = useCallback((choice: QrLandingChoice) => {
        if (choice === 'upload' || choice === 'wish') setChosen(choice);
    }, []);
    // Back goes where the form was opened from: a browser back to the feed for the feed's Photos action
    // (the feed itself when there is no in-app page behind this one), the choices otherwise.
    const feedPath = requested && !chosen && eventId ? routes.events.feed(eventId) : null;
    const back = useCallback(() => {
        if (feedPath) {
            if (hasInAppPrevious()) router.back();
            else router.push(feedPath);
            return;
        }
        setChosen('chooser');
        setIsSent(false);
    }, [feedPath, router]);

    return {
        resolution,
        error: resolutionQuery.error,
        isLoading: resolutionQuery.isLoading || (isActive && isVisitorLoading) || Boolean(redirectPath),
        plan,
        eventId,
        view,
        choose,
        back,
        isSent,
        setIsSent,
        canGoBack: Boolean(feedPath) || (startView === 'chooser' && view !== 'chooser'),
        uploadToken: resolveQrLandingToken(plan.uploadToken, token),
        wishToken: resolveQrLandingToken(plan.wishToken, token),
        // A member uploads as themselves: no name to type, no boxes to tick.
        member: membership && eventId ? { eventId, displayName: membership.displayName } : null,
    };
}
