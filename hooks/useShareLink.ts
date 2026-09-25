'use client';

import { useLocale } from 'next-intl';

import { withShareLocale } from '@/lib/shareLinks';

// The link as the host should hand it out: tagged with the language they are
// using, so guests and the link preview see the same one.
export function useShareLink(url: string): string {
    const locale = useLocale();
    return withShareLocale(url, locale);
}
