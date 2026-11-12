'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useEventModules } from '@/hooks/useEventModules';
import { useMyEvents } from '@/hooks/useMyEvents';
import { useQrLinkResolution } from '@/hooks/useQrLinks';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { type QrLandingChoice, qrLandingChoiceHref, type QrLandingForm, qrLandingPlan, qrLandingStart, resolveQrLandingToken } from '@/lib/qrLanding';
import { getQrRedirectPath } from '@/lib/qrLinks';

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

    // A personal invitation keeps opening the invite page, and a single choice on another page is followed.
    const redirectPath = isVisitorLoading
        ? null
        : (getQrRedirectPath(resolution?.targetType === 'INVITATION' ? resolution : null) ??
          (start && start !== 'chooser' ? qrLandingChoiceHref(start, plan, eventId) : null));

    useEffect(() => {
        if (redirectPath) router.replace(redirectPath);
    }, [redirectPath, router]);

    const [chosen, setChosen] = useState<QrLandingForm | null>(null);
    const startView: QrLandingView | null = start === 'upload' || start === 'wish' || start === 'chooser' ? start : null;
    const view: QrLandingView | null = chosen ?? startView;

    const choose = useCallback((choice: QrLandingChoice) => {
        if (choice === 'upload' || choice === 'wish') setChosen(choice);
    }, []);
    const back = useCallback(() => setChosen(null), []);

    return {
        resolution,
        error: resolutionQuery.error,
        isLoading: resolutionQuery.isLoading || (isActive && isVisitorLoading) || Boolean(redirectPath),
        plan,
        eventId,
        view,
        choose,
        back,
        canGoBack: startView === 'chooser' && chosen !== null,
        uploadToken: resolveQrLandingToken(plan.uploadToken, token),
        wishToken: resolveQrLandingToken(plan.wishToken, token),
        // A member uploads as themselves: no name to type, no boxes to tick.
        member: membership && eventId ? { eventId, displayName: membership.displayName } : null,
    };
}
