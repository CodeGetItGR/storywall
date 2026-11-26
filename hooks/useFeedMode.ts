'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import type { EventDetailResponseDto } from '@/lib/api/types';
import { isInvitationOnly } from '@/lib/eventCapabilities';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import {
    eventDayOf,
    type FeedMode,
    type FeedPageMode,
    openingFeedMode,
    parseFeedModeParam,
    readFeedModePick,
    todayFor,
    VIEW_PARAM,
    withViewParam,
} from '@/lib/feedMode';
import { saveFeedModePick, serverFeedModePick, storedFeedModePick, subscribeFeedModePicks } from '@/lib/feedModeStore';
import { replacePageUrl } from '@/lib/overlayHistory';
import { useFeedEditorEnabled } from '@/providers/FeedEditorFlagProvider';

type FeedModeEvent = Pick<EventDetailResponseDto, 'id' | 'modules' | 'schedule' | 'sessions' | 'capabilities' | 'suspended'>;

// What the page opens on. expected: the best guess while the viewer's last pick isn't read yet, for the loading state.
function useFeedOpening(event: FeedModeEvent | null) {
    const enabled = useFeedEditorEnabled();
    const saveMyDate = enabled && isModuleAvailable(event?.modules, 'save_my_date');
    const invitationOnly = saveMyDate && event !== null && isInvitationOnly(event);
    const available = saveMyDate && !invitationOnly;
    const param = parseFeedModeParam(useSearchParams().get(VIEW_PARAM));
    const raw = useSyncExternalStore(subscribeFeedModePicks, () => (event ? storedFeedModePick(event.id) : null), serverFeedModePick);

    const opening = useMemo(
        () => event && openingFeedMode({ today: todayFor(event), eventDay: eventDayOf(event), pick: readFeedModePick(raw), param }),
        [event, param, raw],
    );
    // The one page of an event without the switch.
    const fixed: FeedPageMode = invitationOnly ? 'invitation' : 'single';

    return { available, fixed, opening: raw === undefined ? null : opening, expected: available && opening ? opening.mode : fixed };
}

// The mode an event's feed is likely to open on, before the page itself is here. null: the event isn't known yet.
export function useExpectedFeedMode(event: FeedModeEvent | null): FeedPageMode | null {
    const { expected } = useFeedOpening(event);
    return event && expected;
}

// The feed page's mode. available: the event has Save my date beside the feed (and the feed editor is on), so the page
// has the switch. mode: null while it isn't known yet (the server, the first client render), and always without the
// switch. pageMode: what the page draws, null while it isn't known yet.
export function useFeedMode(event: FeedModeEvent) {
    const { available, fixed, opening, expected } = useFeedOpening(event);
    const pathname = usePathname();
    const [selected, setSelected] = useState<FeedMode | null>(null);

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

    const mode = available ? (selected ?? opening?.mode ?? null) : null;
    return { available, mode, pageMode: available ? mode : fixed, expected, select };
}
