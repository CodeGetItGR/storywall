'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';

import { useAppBetaFeedbackConfig, useAppErrorTrackingEnabled } from '@/hooks/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { useCrashReporter } from '@/hooks/useCrashReporter';
import { useRouteTemplateSync } from '@/hooks/useRouteTemplateSync';
import { useRouteEventId } from '@/providers/EventProvider';

// Beta feedback for the whole app: keeps the page template current, installs
// the crash reporter while error tracking is on, and decides whether the
// "Report a problem" button shows. Reports need a signed-in caller (user,
// guest or admin); /demo runs on mocks and never reports.
export function useBetaFeedback() {
    useRouteTemplateSync();
    const config = useAppBetaFeedbackConfig();
    const errorTrackingEnabled = useAppErrorTrackingEnabled();
    const { user } = useAuth();
    const isDemoRoute = usePathname()?.startsWith('/demo') ?? false;
    const eventId = useRouteEventId();
    const [open, setOpen] = useState(false);

    useCrashReporter(errorTrackingEnabled && !isDemoRoute);

    const openReport = useCallback(() => setOpen(true), []);
    const closeReport = useCallback(() => setOpen(false), []);

    return {
        config: config && user && !isDemoRoute ? config : null,
        eventId,
        open,
        openReport,
        closeReport,
    };
}
