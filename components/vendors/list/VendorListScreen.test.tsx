import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VendorListScreen } from '@/components/vendors/list/VendorListScreen';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));
vi.mock('@/components/tools/ModulePageShell', () => ({ ModulePageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/routing/EventRouteGate', () => ({ useEventRouteContext: () => ({ eventId: 'e1', activeEvent: { id: 'e1' }, isHost: false }) }));
const list = vi.hoisted(() => ({ data: [] as unknown[], isLoading: false }));
const me = vi.hoisted(() => ({ data: null as null | { vendorId: string } }));
const recordClick = vi.fn();
vi.mock('@/hooks/useVendors', () => ({
    useEventVendors: () => list,
    useMyVendorRole: () => me,
    useRecordVendorClick: () => recordClick,
}));

function row(overrides: Record<string, unknown> = {}) {
    return {
        id: 'v1',
        memberId: 'm1',
        vendorType: 'PHOTOGRAPHER',
        businessName: 'Studio X',
        link: '@studio.x',
        logoUrl: null,
        joinedAt: '2026-10-01T00:00:00Z',
        ...overrides,
    };
}

beforeEach(() => {
    recordClick.mockReset();
    list.isLoading = false;
    me.data = null;
    list.data = [row()];
});
afterEach(cleanup);

describe('VendorListScreen', () => {
    it('shows name, type and an outgoing link that records a click', () => {
        render(<VendorListScreen />);
        const link = screen.getByRole('link', { name: 'list.open:{"name":"Studio X"}' });
        expect(link.getAttribute('href')).toBe('https://instagram.com/studio.x');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toContain('noopener');
        expect(screen.getByText('types.PHOTOGRAPHER')).toBeTruthy();
        fireEvent.click(link);
        expect(recordClick).toHaveBeenCalledWith('v1');
    });

    it('does not record a click on the caller\'s own row', () => {
        me.data = { vendorId: 'v1' };
        render(<VendorListScreen />);
        fireEvent.click(screen.getByRole('link', { name: 'list.open:{"name":"Studio X"}' }));
        expect(recordClick).not.toHaveBeenCalled();
    });

    it('lists rows in vendor type order', () => {
        list.data = [
            row({ id: 'v2', vendorType: 'MUSIC', businessName: 'Beats' }),
            row({ id: 'v3', vendorType: 'PLANNER', businessName: 'Plans' }),
            row(),
        ];
        render(<VendorListScreen />);
        expect(screen.getAllByRole('link').map((link) => link.getAttribute('aria-label'))).toEqual([
            'list.open:{"name":"Plans"}',
            'list.open:{"name":"Studio X"}',
            'list.open:{"name":"Beats"}',
        ]);
    });

    it('shows a row without a usable link as plain text', () => {
        list.data = [row({ link: null })];
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
