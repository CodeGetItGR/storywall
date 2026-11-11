'use client';

import { useCallback, useMemo } from 'react';

import { useCopyText } from '@/hooks/useCopyText';
import { themeShareLinks } from '@/lib/invitation/themeCatalogue';

// The theme page's share links, and copying its address.
export function useThemeShare(url: string, text: string) {
    const links = useMemo(() => themeShareLinks(url, text), [url, text]);
    const { copied, copy } = useCopyText(url);
    // A browser without clipboard access leaves the button as it was.
    const copyLink = useCallback(() => {
        copy().catch(() => undefined);
    }, [copy]);
    return { links, copied, copyLink };
}
