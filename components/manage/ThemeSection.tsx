'use client';

import { FeedThemePicker } from '@/components/manage/FeedThemePicker';
import { ThemePicker } from '@/components/manage/ThemePicker';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isCatalogueEventType } from '@/lib/invitation/themeCatalogue';
import { useFeedEditorEnabled } from '@/providers/FeedEditorFlagProvider';

type ThemeSectionProps = { event: EventDetailResponseDto; canWrite: boolean; onOpenBilling: () => void };

// The manage page's Theme section. With the feed editor on, an event type that has Save my date themes
// lists them too; otherwise it is today's wall-only picker.
export function ThemeSection({ event, canWrite, onOpenBilling }: ThemeSectionProps) {
    const feedEditor = useFeedEditorEnabled();
    if (feedEditor && isCatalogueEventType(event.eventType)) {
        return <FeedThemePicker event={event} canWrite={canWrite} onOpenBilling={onOpenBilling} />;
    }
    return <ThemePicker event={event} canWrite={canWrite} showHeading={false} />;
}
