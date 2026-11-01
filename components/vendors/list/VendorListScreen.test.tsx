import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VendorListScreen } from '@/components/vendors/list/VendorListScreen';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));
vi.mock('@/components/tools/ModulePageShell', () => ({ ModulePageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/routing/EventRouteGate', () => ({ useEventRouteContext: () => ({ eventId: 'e1', activeEvent: { id: 'e1' }, isHost: false }) }));
vi.mock('@/components/common/ProtectedImage', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    ProtectedImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
const list = vi.hoisted(() => ({ data: [] as unknown[], isLoading: false }));
const recordClick = vi.fn();
vi.mock('@/hooks/useVendors', () => ({
    useEventVendors: () => list,
    useRecordVendorClick: () => recordClick,
}));

function row(overrides: Record<string, unknown> = {}) {
    return {
        id: 'v1',
        memberId: 'm1',
        vendorType: 'PHOTOGRAPHER',
        businessName: 'Studio X',
        instagram: 'studio.x',
        link: '@studio.x',
        logoUrl: null,
        joinedAt: '2026-10-01T00:00:00Z',
        ...overrides,
    };
}

beforeEach(() => {
    recordClick.mockReset();
    list.isLoading = false;
    list.data = [row()];
});
afterEach(cleanup);

describe('VendorListScreen', () => {
    it('shows name, type and an Instagram button that records a click', () => {
        render(<VendorListScreen />);
        const link = screen.getByRole('link', { name: 'list.instagramOf:{"name":"Studio X"}' });
        expect(link.textContent).toBe('list.instagram');
        expect(link.getAttribute('href')).toBe('https://instagram.com/studio.x');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toContain('noopener');
        expect(screen.getByText('types.PHOTOGRAPHER')).toBeTruthy();
        fireEvent.click(link);
        expect(recordClick).toHaveBeenCalledWith('v1');
    });

    it('lists rows in vendor type order', () => {
        list.data = [
            row({ id: 'v2', vendorType: 'MUSIC', businessName: 'Beats' }),
            row({ id: 'v3', vendorType: 'PLANNER', businessName: 'Plans' }),
            row(),
        ];
        render(<VendorListScreen />);
        expect(screen.getAllByRole('link').map((link) => link.getAttribute('aria-label'))).toEqual([
            'list.instagramOf:{"name":"Plans"}',
            'list.instagramOf:{"name":"Studio X"}',
            'list.instagramOf:{"name":"Beats"}',
        ]);
    });

    it('names a web link as the website, and leaves the row itself unlinked', () => {
        list.data = [row({ instagram: null, website: 'https://studio.gr' })];
        render(<VendorListScreen />);
        const link = screen.getByRole('link', { name: 'list.websiteOf:{"name":"Studio X"}' });
        expect(link.getAttribute('href')).toBe('https://studio.gr');
        expect(link.textContent).toBe('list.website');
        expect(link.contains(screen.getByText('Studio X'))).toBe(false);
    });

    it('shows the description and the type’s own service tags', () => {
        list.data = [row({ description: 'Weddings in Athens', serviceTags: ['DRONE', 'DJ', 'ALBUM'] })];
        render(<VendorListScreen />);
        expect(screen.getByText('Weddings in Athens')).toBeTruthy();
        expect(screen.getByText('serviceTags.DRONE')).toBeTruthy();
        expect(screen.getByText('serviceTags.ALBUM')).toBeTruthy();
        expect(screen.queryByText('serviceTags.DJ')).toBeNull();
    });

    it('shows call and email buttons when the vendor shares them', () => {
        list.data = [row({ phone: '+30 210 123 4567', email: 'hi@studio.gr' })];
        render(<VendorListScreen />);
        const call = screen.getByRole('link', { name: 'list.callOf:{"name":"Studio X"}' });
        expect(call.getAttribute('href')).toBe('tel:+302101234567');
        expect(call.getAttribute('target')).toBeNull();
        const email = screen.getByRole('link', { name: 'list.emailOf:{"name":"Studio X"}' });
        expect(email.getAttribute('href')).toBe('mailto:hi@studio.gr');
        fireEvent.click(call);
        expect(recordClick).toHaveBeenCalledWith('v1');
    });

    it('shows a row without a usable link as plain text', () => {
        list.data = [row({ instagram: null, website: 'http://studio.gr' })];
        render(<VendorListScreen />);
        expect(screen.getByText('Studio X')).toBeTruthy();
        expect(screen.queryByRole('link')).toBeNull();
    });

    it('hides rows the host or the vendor hid, and rows without a profile', () => {
        list.data = [row({ hiddenByHost: true }), row({ id: 'v2', optedOut: true }), row({ id: 'v3', businessName: null })];
        render(<VendorListScreen />);
        expect(screen.queryByText('Studio X')).toBeNull();
        expect(screen.getByText('list.empty')).toBeTruthy();
    });

    it('shows the vendor banner as the card cover', () => {
        list.data = [row({ bannerUrl: 'https://r2.test/banner.png' })];
        render(<VendorListScreen />);
        const cover = screen.getByRole('img', { name: 'bannerAlt:{"name":"Studio X"}' });
        expect(cover.getAttribute('src')).toBe('https://r2.test/banner.png');
    });

    it('shows no cover photo without a banner', () => {
        render(<VendorListScreen />);
        expect(screen.queryByRole('img', { name: 'bannerAlt:{"name":"Studio X"}' })).toBeNull();
    });

    it('shows the empty line', () => {
        list.data = [];
        render(<VendorListScreen />);
        expect(screen.getByText('list.empty')).toBeTruthy();
    });

    it('shows no empty line while loading', () => {
        list.data = [];
        list.isLoading = true;
        render(<VendorListScreen />);
        expect(screen.queryByText('list.empty')).toBeNull();
    });
});
