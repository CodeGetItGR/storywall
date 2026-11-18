'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { useCreateEventSession, useEventSessions, useUpdateEventSession } from '@/hooks/useEventSessions';
import { useScheduleSessionLimit } from '@/hooks/useScheduleSessionLimit';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { toDatetimeLocalValue } from '@/lib/datetime';
import { formatPreviewDateTime, showsVenuePart } from '@/lib/settingsPreview';

// The venue part of the Settings preview (the secondary session): whether it shows, the venue
// once added, and today's Schedule editor sheet that adds or edits it.
export function useSettingsVenue(event: EventDetailResponseDto, canWrite: boolean) {
    const tCreateEvent = useTranslations('CreateEventPage');
    const locale = useLocale();
    const shown = showsVenuePart(event);
    const { data: sessions = [] } = useEventSessions(shown ? event.id : null);
    const venue = sessions.find((session) => session.isSecondary) ?? null;
    const canEdit = shown && canWrite;
    const { atSessionLimit, sessionLimitMessage } = useScheduleSessionLimit(event.id, canEdit && !venue, sessions.length);
    const createSession = useCreateEventSession();
    const updateSession = useUpdateEventSession(venue?.id ?? '', event.id);
    const [sheetOpen, setSheetOpen] = useState(false);
    const titleKey = getCreateEventCatalogEntry(event.eventType)?.secondarySessionTitleKey;

    function openSheet() {
        if (!canEdit || (!venue && atSessionLimit)) return;
        setSheetOpen(true);
    }

    function handleSheetOpenChange(open: boolean) {
        setSheetOpen(open && canEdit);
    }

    return {
        shown,
        canEdit,
        venue,
        venueDate: venue ? formatPreviewDateTime(locale, venue.startAt, event.schedule.timezone) : null,
        canAdd: !atSessionLimit,
        sessionLimitMessage,
        sessions,
        sheetOpen,
        openSheet,
        handleSheetOpenChange,
        createSession,
        updateSession,
        defaultStartAt: toDatetimeLocalValue(event.schedule.startAt),
        // A new venue is created as the secondary session, with the type's default title.
        prefillTitle: !venue && titleKey ? tCreateEvent(titleKey) : undefined,
    };
}
