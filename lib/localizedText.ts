import type { LocalizedText } from '@/lib/api/types';

// Shared with hooks/useLocalizedText.ts — kept as a plain function so
// non-hook contexts (e.g. lib/adminPlanEditor.ts) can resolve a locale map
// without needing a component.
export function resolveLocalizedText(text: LocalizedText | null | undefined, locale: string, fallback = ''): string {
    if (!text) return fallback;
    return text[locale] ?? text.en ?? fallback;
}
