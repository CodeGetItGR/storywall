import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ScheduleMapPreview } from '@/components/schedule/ScheduleMapPreview';

const useMapsEmbedUrl = vi.fn((url: string) => ({ embedUrl: `https://www.google.com/maps?q=${encodeURIComponent(url)}&output=embed`, isResolving: false }));
vi.mock('@/hooks/useMapsEmbedUrl', () => ({ useMapsEmbedUrl: (url: string) => useMapsEmbedUrl(url) }));

afterEach(() => {
    cleanup();
    useMapsEmbedUrl.mockClear();
});

const MAPS_URL = 'https://maps.app.goo.gl/abc123';

function renderPreview() {
    return render(
        <ScheduleMapPreview
            mapsUrl={MAPS_URL}
            title="Open map for Ceremony"
            openLabel="Open in Google Maps"
            previewLabel="Map preview"
            unavailableLabel="unavailable"
            showLabel="Show map"
            consentLabel="Loads from Google"
        />,
    );
}

// Cookie Policy §7: nothing is requested from Google, not even the short-link resolve, until asked.
describe('ScheduleMapPreview', () => {
    it('shows a placeholder and a direct Maps link, and resolves nothing, before the click', () => {
        const { container } = renderPreview();

        expect(container.querySelector('iframe')).toBeNull();
        expect(useMapsEmbedUrl).not.toHaveBeenCalled();
        expect(screen.getByText('Loads from Google')).toBeTruthy();
        expect(container.querySelector(`a[href="${MAPS_URL}"]`)).toBeTruthy();
    });

    it('loads the map once "show map" is clicked', () => {
        const { container } = renderPreview();

        fireEvent.click(screen.getByRole('button', { name: 'Show map' }));

        expect(useMapsEmbedUrl).toHaveBeenCalledWith(MAPS_URL);
        expect(container.querySelector('iframe')?.getAttribute('src')).toContain('output=embed');
    });
});
