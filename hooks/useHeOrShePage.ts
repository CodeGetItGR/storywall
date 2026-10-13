'use client';

import { useLocale } from 'next-intl';

import { HE_OR_SHE_MODULE, useHeOrShe, useHeOrSheResults } from '@/hooks/useHeOrShe';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { usePlanUpgradeHref } from '@/hooks/usePlanUpgradeHref';
import { formatDate } from '@/lib/datetime';
import { routes } from '@/lib/routes';
import { useActiveEvent, useIsHost } from '@/providers/EventProvider';

/** What the Boy or Girl? page needs: the event, the caller's role, the view and (for hosts) the results. */
export function useHeOrShePage() {
    const event = useActiveEvent();
    const isHost = useIsHost();
    const eventId = event?.id ?? '';
    const view = useHeOrShe(event?.id ?? null);
    const results = useHeOrSheResults(event?.id ?? null, isHost);
    const readable = useModuleReadable(event?.id ?? null, HE_OR_SHE_MODULE);
    const copy = useModuleCopy(event?.eventType)(HE_OR_SHE_MODULE);
    const upgradeHref = usePlanUpgradeHref(eventId);
    const locale = useLocale();
    const closesAt = view.data?.closesAt;

    function retry() {
        void view.refetch();
    }

    return {
        eventId,
        isHost,
        // Only once the event is known: before that, readability isn't decided yet.
        unavailable: Boolean(event) && !readable,
        view,
        results,
        title: copy.name,
        backHref: routes.events.feed(eventId),
        upgradeHref,
        closesOn: closesAt ? formatDate(locale, closesAt, { dateStyle: 'medium', timeStyle: 'short' }) : null,
        retry,
    };
}
