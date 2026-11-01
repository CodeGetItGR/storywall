'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { replacePageUrl } from '@/lib/overlayHistory';
import { isVendorPageSection, type VendorPageSection } from '@/lib/vendors';

// Each section's title id on the vendor page.
const SECTION_TITLE_IDS: Record<VendorPageSection, string> = {
    proAlbum: 'vendor-pro-title',
    sneakPeek: 'vendor-sneak-peek-title',
    prints: 'vendor-prints-title',
};

// Arriving from a feed quick action (?section=…): scroll to that section once the page is ready and drop the param.
// The sneak peek also opens its sheet when one can be posted now.
export function useVendorPageSectionTarget({
    ready,
    sneakPeekLoading,
    sneakPeekReady,
    openSneakPeek,
}: {
    ready: boolean;
    sneakPeekLoading: boolean;
    sneakPeekReady: boolean;
    openSneakPeek: () => void;
}) {
    const param = useSearchParams().get('section');
    const handled = useRef(false);

    useEffect(() => {
        if (handled.current || !ready || !isVendorPageSection(param)) return;
        if (param === 'sneakPeek' && sneakPeekLoading) return;
        handled.current = true;

        const url = new URL(window.location.href);
        url.searchParams.delete('section');
        replacePageUrl(`${url.pathname}${url.search}${url.hash}`);

        document.getElementById(SECTION_TITLE_IDS[param])?.closest('section')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        if (param === 'sneakPeek' && sneakPeekReady) openSneakPeek();
    }, [openSneakPeek, param, ready, sneakPeekLoading, sneakPeekReady]);
}
