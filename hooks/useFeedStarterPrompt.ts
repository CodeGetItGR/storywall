'use client';

import { useTranslations } from 'next-intl';

import type { EventTypeConvention } from '@/lib/api/types';

// The types whose new feed starts with a photo prompt (spec 2026-11-26-graduation-event-type-design.md §6).
const STARTER_PROMPT_TYPES: ReadonlySet<EventTypeConvention> = new Set(['GRADUATION']);

// The prompt a new feed of this type starts with, in the viewer's language; undefined for other types.
export function useFeedStarterPrompt(eventType: EventTypeConvention | undefined): string | undefined {
    const t = useTranslations('FeedSections.prompt');
    return eventType && STARTER_PROMPT_TYPES.has(eventType) ? t('thenAndNow') : undefined;
}
