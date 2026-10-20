import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ManageVendorsScreen } from '@/components/vendors/manage/ManageVendorsScreen';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/components/tools/ModulePageShell', () => ({ ModulePageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/routing/EventRouteGate', () => ({ useEventRouteContext: () => ({ eventId: 'e1', activeEvent: { id: 'e1' }, isHost: true }) }));
const readable = vi.hoisted(() => ({ value: true }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => readable.value }));
vi.mock('@/hooks/useCopyText', () => ({ useCopyText: () => ({ copied: false, copy: vi.fn() }) }));
vi.mock('@/hooks/useNativeShare', () => ({ useNativeShare: () => ({ canShare: false, share: vi.fn() }) }));
vi.mock('@/hooks/useShareLink', () => ({ useShareLink: (url: string) => url }));
const page = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('@/hooks/useManageVendors', () => ({ useManageVendors: () => page.value }));

function state(overrides: Record<string, unknown> = {}) {
    return {
        links: [{ vendorType: 'PHOTOGRAPHER', inviteToken: 't1' }],
        vendors: [],
        isLoading: false,
        selectedVendor: null,
        resetType: null,
        removeOpen: false,
        qrLink: null,
        error: null,
        isResetting: false,
        isPatching: false,
        isRemoving: false,
        requestReset: vi.fn(),
        cancelReset: vi.fn(),
        confirmReset: vi.fn(),
        openVendor: vi.fn(),
        closeVendor: vi.fn(),
        toggleHidden: vi.fn(),
        requestRemove: vi.fn(),
        cancelRemove: vi.fn(),
        confirmRemove: vi.fn(),
        openQr: vi.fn(),
        closeQr: vi.fn(),
        ...overrides,
    };
}

const JOINED = {
    id: 'v1',
    memberId: 'm1',
    vendorType: 'PHOTOGRAPHER',
    businessName: 'Studio X',
    link: '@studio.x',
    logoUrl: null,
    joinedAt: '2026-10-01T10:00:00Z',
    hiddenByHost: false,
    optedOut: false,
};

beforeEach(() => {
    readable.value = true;
    page.value = state();
});
afterEach(cleanup);

describe('ManageVendorsScreen', () => {
    it('lists one link row per type and the empty joined list', () => {
        render(<ManageVendorsScreen />);
        expect(screen.getByText('types.PHOTOGRAPHER')).toBeTruthy();
        expect(screen.getByText('manage.joinedEmpty')).toBeTruthy();
    });

    it('says links come once the event is live when there are none', () => {
        page.value = state({ links: [] });
        render(<ManageVendorsScreen />);
        expect(screen.getByText('manage.linksEmpty')).toBeTruthy();
    });

    it('asks before resetting', () => {
        render(<ManageVendorsScreen />);
        fireEvent.click(screen.getByRole('button', { name: 'manage.reset' }));
        expect(page.value.requestReset).toHaveBeenCalledWith('PHOTOGRAPHER');
    });

    it('opens the QR for a link', () => {
        render(<ManageVendorsScreen />);
        fireEvent.click(screen.getByRole('button', { name: 'manage.qr' }));
        expect(page.value.openQr).toHaveBeenCalledWith('PHOTOGRAPHER');
    });

    it('shows a joined vendor, with "Hidden" when hidden, and opens the sheet', () => {
        page.value = state({ vendors: [{ ...JOINED, hiddenByHost: true }] });
        render(<ManageVendorsScreen />);
        expect(screen.getByText('Studio X')).toBeTruthy();
        expect(screen.getByText('manage.hidden')).toBeTruthy();
        fireEvent.click(screen.getByText('Studio X'));
        expect(page.value.openVendor).toHaveBeenCalledWith('v1');
    });

    it('names a vendor without a profile plainly', () => {
        page.value = state({ vendors: [{ ...JOINED, vendorType: 'MUSIC', businessName: null, link: null }] });
        render(<ManageVendorsScreen />);
        expect(screen.getByText('manage.noProfile')).toBeTruthy();
    });

    it('turns Show off and says why for an opted-out vendor', () => {
        page.value = state({ vendors: [JOINED], selectedVendor: { ...JOINED, hiddenByHost: true, optedOut: true } });
        render(<ManageVendorsScreen />);
        expect(screen.getByText('manage.optedOut')).toBeTruthy();
        const show = screen.getByRole('button', { name: 'manage.show' }) as HTMLButtonElement;
        expect(show.disabled).toBe(true);
    });

    it('hides and removes from the sheet', () => {
        page.value = state({ vendors: [JOINED], selectedVendor: JOINED });
        render(<ManageVendorsScreen />);
        fireEvent.click(screen.getByRole('button', { name: 'manage.hide' }));
        expect(page.value.toggleHidden).toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'manage.remove' }));
        expect(page.value.requestRemove).toHaveBeenCalled();
    });

    it('shows the module notice without the module', () => {
        readable.value = false;
        render(<ManageVendorsScreen />);
        expect(screen.getByText('manage.unavailable')).toBeTruthy();
        expect(screen.queryByText('manage.linksTitle')).toBeNull();
    });
});
