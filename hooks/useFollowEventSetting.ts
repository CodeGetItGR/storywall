'use client';

import { useCallback } from 'react';

import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { followState, setFollowEvent } from '@/lib/invitation/eventLinks';

// The section's "Follow the event" switch (KAN-84). Turned back on, the section shows the event's data at once.
export function useFollowEventSetting(scope: SettingsScope) {
    const { section, edit, event } = scope;
    const { following } = followState(section);
    const setFollowing = useCallback((next: boolean) => edit(setFollowEvent(section.id, next, event)), [edit, event, section.id]);

    return { following, setFollowing };
}
