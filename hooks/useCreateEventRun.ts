'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useResetOnBfcacheRestore } from '@/hooks/useResetOnBfcacheRestore';
import { clearPendingCheckout } from '@/lib/billing';
import {
    CREATE_EVENT_RUN_PARAM,
    CREATE_EVENT_TYPE_PARAM,
    newCreateEventRunId,
    readCreateEventCheckout,
    rememberCreateEventCheckout,
} from '@/lib/createEventSteps';
import { replacePageUrl } from '@/lib/overlayHistory';
import { routes } from '@/lib/routes';

// How long a step back past a wizard entry may take before the host is sent to
// the draft instead (there may be nothing to go back to).
const STEP_BACK_FALLBACK_MS = 1000;

/**
 * The wizard creates the draft before it opens checkout. Back from checkout
 * reloads the wizard with its fields gone, so a run that went to checkout
 * sends the host to its draft instead: the first wizard entry reached opens
 * the draft's page, and the run's earlier entries step back past themselves.
 * The form stays hidden until the run is known to have no checkout.
 */
export function useCreateEventRun(): { isReady: boolean } {
    const router = useRouter();
    const searchParams = useSearchParams();
    const run = searchParams.get(CREATE_EVENT_RUN_PARAM);
    const step = searchParams.get('step');
    // Kept so the form, which mounts once the run is known, opens on the linked type.
    const type = searchParams.get(CREATE_EVENT_TYPE_PARAM);
    // The run found to have no checkout. Storage is read after mount, so the
    // server render and hydration show the loading state.
    const [checkedRun, setCheckedRun] = useState<string | null>(null);

    // A page restored from the back/forward cache still shows the form: check again.
    useResetOnBfcacheRestore(useCallback(() => setCheckedRun(null), []));

    useEffect(() => {
        if (!run) {
            replacePageUrl(routes.events.new({ step, run: newCreateEventRunId(), type }));
            return;
        }
        if (checkedRun === run) return;

        const checkout = readCreateEventCheckout(run);
        if (!checkout) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is client-only, so it is read once after mount.
            setCheckedRun(run);
            return;
        }

        const draftPage = routes.events.manage(checkout.eventId, { tab: 'overview', cancelled: true });
        if (!checkout.returned) {
            rememberCreateEventCheckout(run, checkout.eventId, true);
            clearPendingCheckout(checkout.eventId);
            router.replace(draftPage);
            return;
        }

        window.history.back();
        const fallback = window.setTimeout(() => router.replace(draftPage), STEP_BACK_FALLBACK_MS);
        return () => window.clearTimeout(fallback);
    }, [checkedRun, router, run, step, type]);

    return { isReady: Boolean(run) && checkedRun === run };
}
