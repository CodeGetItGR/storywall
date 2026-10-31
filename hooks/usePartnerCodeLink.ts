'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { replacePageUrl } from '@/lib/overlayHistory';
import { partnerCodeFromUrl, savePartnerCode, withoutPartnerCodeParam } from '@/lib/partnerCodeLink';

// Saves the code from a partner's link for the activation checkout. The newest link wins.
export function usePartnerCodeLink() {
    const pathname = usePathname();

    useEffect(() => {
        const { href } = window.location;
        const code = partnerCodeFromUrl(href);
        if (code) savePartnerCode(code);
        const cleaned = withoutPartnerCodeParam(href);
        if (cleaned) replacePageUrl(cleaned);
    }, [pathname]);
}
