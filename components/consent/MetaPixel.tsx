'use client';

import Script from 'next/script';

import { type MetaPixelOptions, useMetaPixel } from '@/hooks/useMetaPixel';
import { META_PIXEL_SCRIPT_URL } from '@/lib/metaPixel';

// The Meta Pixel. Mounted next to the Google tag: on the public pages (where
// ad clicks arrive) and the checkout success page (where purchases are
// recorded). Renders nothing without consent to advertising.
export function MetaPixel(options: MetaPixelOptions) {
    const pixelId = useMetaPixel(options);
    if (!pixelId) return null;

    return <Script id="meta-pixel" src={META_PIXEL_SCRIPT_URL} strategy="afterInteractive" />;
}
