'use client';

import { type MouseEvent } from 'react';

import { useCopyText } from '@/hooks/useCopyText';

// Copy a campaign link, or save its QR code as an SVG named after the campaign. The QR code is the
// svg inside the same [data-campaign-share] block as the clicked button.
export function useCampaignLinkShare(url: string, fileName: string) {
    const { copied, copy } = useCopyText(url);

    function handleCopyClick() {
        void copy();
    }

    function handleDownloadQrClick(event: MouseEvent<HTMLButtonElement>) {
        const svg = event.currentTarget.closest('[data-campaign-share]')?.querySelector('svg');
        if (!svg) return;
        const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = `${fileName || 'campaign'}.svg`;
        link.click();
        URL.revokeObjectURL(href);
    }

    return { copied, handleCopyClick, handleDownloadQrClick };
}
