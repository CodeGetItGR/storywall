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
            me: { vendorId: 'v1', vendorType: 'PHOTOGRAPHER', accessOpen: false, accessEndsAt: null, toolsOff: 'MODULE_OFF', proStorageBytes: 0, proUsedBytes: 5 },
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
