import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVendorPageClickTracking } from '@/hooks/useVendorPageClickTracking';
import { vendorPageLinkAttributes } from '@/lib/vendorPageTracking';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@vercel/analytics', () => ({ track }));

function attributes(record: Record<string, string>) {
    return Object.entries(record)
        .map(([name, value]) => `${name}='${value}'`)
        .join(' ');
}

// The links a vendor page renders: another vendor page, the business page and an untagged link.
function mountVendorPage() {
    document.body.innerHTML = `
        <main id="page">
            <a href="#dj" id="dj" ${attributes(vendorPageLinkAttributes({ type: 'PHOTOGRAPHER', target: 'MUSIC' }))}><span id="djLabel">DJs</span></a>
            <a href="#all" id="all" ${attributes(vendorPageLinkAttributes({ type: 'PHOTOGRAPHER', target: 'all' }))}>All</a>
            <a href="#plain" id="plain">Untracked</a>
        </main>
    `;
    const page = document.getElementById('page') as HTMLElement;
    renderHook(() => useVendorPageClickTracking({ current: page }));
}

function click(id: string) {
    document.getElementById(id)?.click();
}

beforeEach(() => {
    track.mockClear();
    mountVendorPage();
});

afterEach(() => {
    document.body.innerHTML = '';
});

describe('useVendorPageClickTracking', () => {
    it('sends the page and where the link goes, even when its label is clicked', () => {
        click('djLabel');
        click('all');

        expect(track).toHaveBeenNthCalledWith(1, 'Vendor Page Link', { type: 'PHOTOGRAPHER', target: 'MUSIC' });
        expect(track).toHaveBeenNthCalledWith(2, 'Vendor Page Link', { type: 'PHOTOGRAPHER', target: 'all' });
    });

    it('ignores untagged links', () => {
        click('plain');

        expect(track).not.toHaveBeenCalled();
    });
});
