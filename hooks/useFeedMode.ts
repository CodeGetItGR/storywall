'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import type { EventDetailResponseDto } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { eventDayOf, type FeedMode, openingFeedMode, parseFeedModeParam, readFeedModePick, todayFor, VIEW_PARAM, withViewParam } from '@/lib/feedMode';
import { saveFeedModePick, serverFeedModePick, storedFeedModePick, subscribeFeedModePicks } from '@/lib/feedModeStore';
import { replacePageUrl } from '@/lib/overlayHistory';
import { useFeedEditorEnabled } from '@/providers/FeedEditorFlagProvider';

type FeedModeEvent = Pick<EventDetailResponseDto, 'id' | 'modules' | 'schedule' | 'sessions'>;

// The feed page's mode. available: the event has Save my date (and the feed editor is on), so the page has the
// switch. mode: null while it isn't known yet (the server, the first client render), and always without the switch.
export function useFeedMode(event: FeedModeEvent) {
    const enabled = useFeedEditorEnabled();
    const available = enabled && isModuleAvailable(event.modules, 'save_my_date');
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const param = parseFeedModeParam(searchParams.get(VIEW_PARAM));
    const raw = useSyncExternalStore(subscribeFeedModePicks, () => storedFeedModePick(event.id), serverFeedModePick);
    const [selected, setSelected] = useState<FeedMode | null>(null);

    const opening = useMemo(
        () => (raw === undefined ? null : openingFeedMode({ today: todayFor(event), eventDay: eventDayOf(event), pick: readFeedModePick(raw), param })),
        [event, param, raw],
    );

    // A link's mode, and the event day's one-time reset, become the stored pick.
    useEffect(() => {
        if (available && opening?.save) saveFeedModePick(event.id, opening.save);
    }, [available, event.id, opening]);

    const select = useCallback(
        (mode: FeedMode) => {
            setSelected(mode);
            saveFeedModePick(event.id, { mode, savedDay: todayFor(event) });
            replacePageUrl(withViewParam(pathname, window.location.search, mode));
        },
        [event, pathname],
    );

    return { available, mode: available ? (selected ?? opening?.mode ?? null) : null, select };
}
