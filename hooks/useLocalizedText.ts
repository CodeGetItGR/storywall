'use client';

import { useLocale } from 'next-intl';
import { useCallback } from 'react';

import type { LocalizedText } from '@/lib/api/types';
import { resolveLocalizedText } from '@/lib/localizedText';

export function useLocalizedText() {
    const locale = useLocale();

    return useCallback((text: LocalizedText | null | undefined, fallback = '') => resolveLocalizedText(text, locale, fallback), [locale]);
}
