import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VendorMeScreen } from '@/components/vendors/me/VendorMeScreen';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/components/tools/ModulePageShell', () => ({ ModulePageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/lib/datetime', () => ({ formatDate: () => '12 July 2027' }));
vi.mock('@/components/routing/EventRouteGate', () => ({ useEventRouteContext: () => ({ eventId: 'e1', activeEvent: { id: 'e1' }, isHost: false }) }));
vi.mock('@/components/vendors/me/ProAlbumSection', () => ({ ProAlbumSection: () => <p>pro album</p> }));
vi.mock('@/components/vendors/me/PartnerPromptCard', () => ({ PartnerPromptCard: () => <p>partner prompt</p> }));
vi.mock('@/components/vendors/VendorProfileSheet', () => ({ VendorProfileSheet: () => <p>profile sheet</p> }));
vi.mock('@/components/vendors/me/PrintsSection', () => ({ PrintsSection: () => <p>prints section</p> }));
vi.mock('@/components/vendors/me/PrintsIncludedSheet', () => ({ PrintsIncludedSheet: () => null }));
vi.mock('@/components/vendors/me/ServicesSection', () => ({ ServicesSection: () => <p>services section</p> }));
vi.mock('@/components/vendors/me/SneakPeekSection', () => ({ SneakPeekSection: () => <p>sneak peek section</p> }));
vi.mock('@/components/vendors/me/SneakPeekSheet', () => ({ SneakPeekSheet: () => <p>sneak peek sheet</p> }));
vi.mock('@/components/vendors/me/ServiceSheet', () => ({ ServiceSheet: () => <p>service sheet</p> }));
vi.mock('@/components/ui/ConfirmActionModal', () => ({ ConfirmActionModal: () => null }));
const prints = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const services = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('@/hooks/useVendorPrintsSection', () => ({ useVendorPrintsSection: () => prints.value }));
vi.mock('@/hooks/useVendorServicesSection', () => ({ useVendorServicesSection: () => services.value }));
const sneakPeek = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('@/hooks/useSneakPeekSection', () => ({ useSneakPeekSection: () => sneakPeek.value }));
const page = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('@/hooks/useVendorMePage', () => ({ useVendorMePage: () => page.value }));

function state(overrides: Record<string, unknown> = {}) {
    return {
        me: {
            vendorId: 'v1',
            vendorType: 'PLANNER',
            accessOpen: true,
            accessEndsAt: '2027-07-12T00:00:00Z',
            proStorageBytes: null,
            proUsedBytes: null,
            toolsOff: null,
        },
        isLoading: false,
        profile: { businessName: 'Plans & Co', vendorType: 'PLANNER', link: '@plans', logoUrl: null, partnerPromptDismissed: false },
        tools: [{ key: 'schedule', href: '/events/e1/tools/schedule' }],
        hasProAlbum: false,
        canUploadPro: true,
        canChooseListing: true,
        listed: true,
        hiddenByHost: false,
        showPartnerPrompt: false,
        toggleListed: vi.fn(),
        isTogglingListed: false,
        error: null,
        profileOpen: false,
        openProfile: vi.fn(),
        closeProfile: vi.fn(),
        ...overrides,
    };
}

beforeEach(() => {
    page.value = state();
    prints.value = { open: false, includedOpen: false, error: null };
    services.value = { visible: false, editing: null, confirmDelete: false, error: null };
    sneakPeek.value = { visible: false, state: 'hidden', sheet: null, confirmDelete: false };
});
afterEach(cleanup);

describe('VendorMeScreen', () => {
    it('shows the access date, the tools, the switch and the details', () => {
        render(<VendorMeScreen />);
        expect(screen.getByText('me.accessUntil:{"date":"12 July 2027"}')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'me.tools.schedule' }).getAttribute('href')).toBe('/events/e1/tools/schedule');
        expect(screen.getByRole('switch', { name: /me.listingSwitch/ }).getAttribute('aria-checked')).toBe('true');
        expect(screen.getByText('Plans & Co')).toBeTruthy();
        expect(screen.queryByText('pro album')).toBeNull();
        expect(screen.queryByText('partner prompt')).toBeNull();
    });

    it('shows the Prints section for a photographer with print picks', () => {
        prints.value = { open: true, includedOpen: false, error: null };
        render(<VendorMeScreen />);
        expect(screen.getByText('prints section')).toBeTruthy();
        expect(screen.queryByText('services section')).toBeNull();
    });

    it('shows the Services section and the size sheet while a size is open', () => {
        services.value = { visible: true, editing: 'new', confirmDelete: false, error: null };
        render(<VendorMeScreen />);
        expect(screen.getByText('services section')).toBeTruthy();
        expect(screen.getByText('service sheet')).toBeTruthy();
        expect(screen.queryByText('prints section')).toBeNull();
    });

    it('shows the Sneak peek section and its sheet while it is open', () => {
        sneakPeek.value = { visible: true, state: 'ready', sheet: 'new', confirmDelete: false, candidates: [], thumbnails: [] };
        render(<VendorMeScreen />);
        expect(screen.getByText('sneak peek section')).toBeTruthy();
        expect(screen.getByText('sneak peek sheet')).toBeTruthy();
    });

    it('hides the Sneak peek section when it does not apply', () => {
        render(<VendorMeScreen />);
        expect(screen.queryByText('sneak peek section')).toBeNull();
        expect(screen.queryByText('sneak peek sheet')).toBeNull();
    });

    it('shows the Pro album and the partner prompt when they apply', () => {
        page.value = state({ hasProAlbum: true, showPartnerPrompt: true });
        render(<VendorMeScreen />);
        expect(screen.getByText('pro album')).toBeTruthy();
        expect(screen.getByText('partner prompt')).toBeTruthy();
    });

    it('says when the tools have stopped', () => {
        page.value = state({
            me: { vendorId: 'v1', vendorType: 'PLANNER', accessOpen: false, accessEndsAt: '2026-01-01T00:00:00Z', toolsOff: 'ACCESS_ENDED' },
            tools: [],
        });
        render(<VendorMeScreen />);
        expect(screen.getByText('me.toolsOff.ACCESS_ENDED')).toBeTruthy();
        expect(screen.queryByText(/me.accessUntil/)).toBeNull();
        expect(screen.queryByText('me.toolsTitle')).toBeNull();
    });

    it('with the vendors module off shows the reason and the details, without the list switch', () => {
        page.value = state({
            me: {
                vendorId: 'v1',
                vendorType: 'PHOTOGRAPHER',
                accessOpen: false,
                accessEndsAt: null,
                toolsOff: 'MODULE_OFF',
                proStorageBytes: 0,
                proUsedBytes: 5,
            },
            tools: [],
            canChooseListing: false,
        });
        render(<VendorMeScreen />);
        expect(screen.getByText('me.toolsOff.MODULE_OFF')).toBeTruthy();
        expect(screen.getByText('Plans & Co')).toBeTruthy();
        expect(screen.queryByRole('switch')).toBeNull();
        expect(screen.queryByText('me.toolsTitle')).toBeNull();
    });

    it('tells the host when the host hid them', () => {
        page.value = state({ hiddenByHost: true });
        render(<VendorMeScreen />);
        expect(screen.getByText('me.listingHiddenByHost')).toBeTruthy();
    });

    it('still offers to fill in the details before there is a profile', () => {
        page.value = state({ profile: null });
        render(<VendorMeScreen />);
        expect(screen.getByRole('button', { name: 'me.profileEdit' })).toBeTruthy();
    });

    it('says plainly when the caller is not a vendor', () => {
        page.value = state({ me: null, profile: null, tools: [] });
        render(<VendorMeScreen />);
        expect(screen.getByText('me.notVendor')).toBeTruthy();
    });
});
