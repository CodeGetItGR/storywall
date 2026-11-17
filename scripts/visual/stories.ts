import { type CaptureLocale, LOCALES, TAG_DESKTOP_ONLY, TAG_MOBILE_ONLY, TAG_SKIP, type WidthName, WIDTHS } from './config';
import type { CaptureTarget } from './types';

type IndexEntry = { id: string; title: string; name: string; type: string; tags?: string[] };
export type StoryIndex = { v: number; entries: Record<string, IndexEntry> };

export const captureId = (storyId: string, locale: CaptureLocale, width: WidthName) => `${storyId}--${locale}--${width}`;

function widthsFor(tags: string[]): WidthName[] {
    if (tags.includes(TAG_DESKTOP_ONLY)) return ['desktop'];
    if (tags.includes(TAG_MOBILE_ONLY)) return ['mobile'];
    return WIDTHS.map((width) => width.name);
}

// Sorted, so runs capture in the same order and logs can be compared.
export function buildCaptureList(index: StoryIndex): CaptureTarget[] {
    const targets: CaptureTarget[] = [];
    for (const entry of Object.values(index.entries)) {
        const tags = entry.tags ?? [];
        if (entry.type !== 'story' || tags.includes(TAG_SKIP)) continue;
        for (const locale of LOCALES) {
            for (const width of widthsFor(tags)) {
                targets.push({ id: captureId(entry.id, locale, width), storyId: entry.id, title: entry.title, name: entry.name, locale, width });
            }
        }
    }
    return targets.sort((a, b) => a.id.localeCompare(b.id));
}
