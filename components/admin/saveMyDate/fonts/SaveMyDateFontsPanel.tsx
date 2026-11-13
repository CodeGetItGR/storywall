'use client';

import { ThemeFontsPanel } from '@/components/admin/themeFonts/ThemeFontsPanel';
import { useSaveMyDateEventTypes } from '@/hooks/useSaveMyDateEventTypes';

// Save my date → Fonts: the theme fonts screen on Save my date's own list, with event types.
export function SaveMyDateFontsPanel() {
    const eventTypes = useSaveMyDateEventTypes();
    return <ThemeFontsPanel library="INVITATION" eventTypes={eventTypes} />;
}
