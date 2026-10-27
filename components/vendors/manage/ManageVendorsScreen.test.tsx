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
const invite = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('@/hooks/useVendorInvite', () => ({ useVendorInvite: () => invite.value }));

const LINK = { vendorType: 'PHOTOGRAPHER', inviteToken: 't1' };

function inviteState(overrides: Record<string, unknown> = {}) {
    return {
        links: [LINK, { vendorType: 'MUSIC', inviteToken: 't2' }],
        link: LINK,
        isLoading: false,
        open: false,
        qrOpen: false,
        resetOpen: false,
        error: null,
        isResetting: false,
        openInvite: vi.fn(),
        closeInvite: vi.fn(),
        pickType: vi.fn(),
        toggleQr: vi.fn(),
        requestReset: vi.fn(),
        cancelReset: vi.fn(),
        confirmReset: vi.fn(),
        ...overrides,
    };
}

function state(overrides: Record<string, unknown> = {}) {
    return {
        vendors: [],
        isLoading: false,
        selectedVendor: null,
        removeOpen: false,
        error: null,
        isPatching: false,
        isRemoving: false,
        openVendor: vi.fn(),
        closeVendor: vi.fn(),
        toggleHidden: vi.fn(),
        requestRemove: vi.fn(),
        cancelRemove: vi.fn(),
        confirmRemove: vi.fn(),
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
    invite.value = inviteState();
});
afterEach(cleanup);

describe('ManageVendorsScreen', () => {
    it('shows one Invite button and the empty joined list, without a row per type', () => {
        render(<ManageVendorsScreen />);
        fireEvent.click(screen.getByRole('button', { name: 'manage.invite' }));
        expect(invite.value.openInvite).toHaveBeenCalled();
        expect(screen.queryByText('types.MUSIC')).toBeNull();
        expect(screen.getByText('manage.joinedEmpty')).toBeTruthy();
    });

    it('says vendors can be invited once the event is live when there are no links', () => {
        invite.value = inviteState({ links: [], link: null });
        render(<ManageVendorsScreen />);
        expect(screen.getByText('manage.linksEmpty')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'manage.invite' })).toBeNull();
    });

    it('picks a type, shows the QR and asks before resetting in the invite sheet', () => {
        invite.value = inviteState({ open: true, qrOpen: true });
        render(<ManageVendorsScreen />);
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'MUSIC' } });
        expect(invite.value.pickType).toHaveBeenCalledWith('MUSIC');
        expect(screen.getByRole('button', { name: 'manage.copy' })).toBeTruthy();
        expect(screen.getByTitle(/manage\.qrTitle/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'manage.qr' }));
        expect(invite.value.toggleQr).toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'manage.reset' }));
        expect(invite.value.requestReset).toHaveBeenCalled();
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
        expect(screen.queryByRole('button', { name: 'manage.invite' })).toBeNull();
    });
});
