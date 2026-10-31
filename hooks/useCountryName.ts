'use client';

import { useLocale } from 'next-intl';
import { useCallback, useMemo } from 'react';

// A country's name in the console's language, falling back to its code.
export function useCountryName() {
    const locale = useLocale();
    const names = useMemo(() => new Intl.DisplayNames([locale], { type: 'region' }), [locale]);
    return useCallback(
        (code: string) => {
            try {
                return names.of(code) ?? code;
            } catch {
                return code;
            }
        },
        [names],
    );
}
