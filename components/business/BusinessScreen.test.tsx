import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BusinessScreen } from '@/components/business/BusinessScreen';
import messages from '@/messages/en.json';

const page = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('@/hooks/useBusinessPage', () => ({ useBusinessPage: () => page.value }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { email: 'nikos@example.com' } }) }));
vi.mock('@/components/business/BusinessTrendChart', () => ({ BusinessTrendChart: () => null }));
vi.mock('@/components/vendors/BecomePartnerSheet', () => ({ BecomePartnerSheet: () => null }));
vi.mock('@/components/vendors/VendorProfileSheet', () => ({ VendorProfileSheet: () => <p>profile sheet</p> }));
vi.mock('next/navigation', () => ({ usePathname: () => '/business', useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));

const services = {
    visible: false,
    approved: false,
    isLoading: false,
    loadFailed: false,
    sizes: [],
    canAdd: true,
    needsProfile: false,
    profileLoading: false,
    editing: null,
    openNew: vi.fn(),
    openEdit: vi.fn(),
    close: vi.fn(),
    save: vi.fn(),
    isSaving: false,
    confirmDelete: false,
    requestDelete: vi.fn(),
    cancelDelete: vi.fn(),
    confirmRemove: vi.fn(),
    isDeleting: false,
    sectionError: null,
    sheetError: null,
};

const contact = {
    open: false,
    openSheet: vi.fn(),
    closeSheet: vi.fn(),
    topic: null,
    setTopic: vi.fn(),
    message: '',
    setMessage: vi.fn(),
    topicError: null,
    messageError: null,
    sendError: null,
    sent: false,
    isSending: false,
    submit: vi.fn(),
};

const ready = {
    isLoading: false,
    notVendor: false,
    loadFailed: false,
    retry: vi.fn(),
    overview: { partner: false, showPartnerPrompt: false, vendorType: 'MUSIC', totals: { events: 1, guests: 10, listTaps: 0 } },
    sections: { content: false, printPrices: false, feedCard: false, sneakPeekSample: false, previews: false, partnerPrompt: false },
    profile: { businessName: 'DJ Nikos', logoUrl: null, vendorType: 'MUSIC' },
    profileState: 'ready',
    retryProfile: vi.fn(),
    needsProfile: false,
    name: 'DJ Nikos' as string | null,
    earnings: { state: 'hidden' } as Record<string, unknown>,
    retryEarnings: vi.fn(),
    cardPreview: null,
    events: {
        events: [],
        isLoading: false,
        loadFailed: false,
        isEmpty: false,
        hasMore: false,
        isLoadingMore: false,
        loadMore: vi.fn(),
        retry: vi.fn(),
    },
    services,
    contact,
    becomePartner: { sheetOpen: false, openSheet: vi.fn(), closeSheet: vi.fn(), defaults: {}, search: '' },
    profileOpen: false,
    openProfile: vi.fn(),
    closeProfile: vi.fn(),
};

// A photographer who isn't a partner: print prices (with their locked sample) and the server's go-ahead for the prompt.
const photographer = {
    ...ready,
    overview: { ...ready.overview, vendorType: 'PHOTOGRAPHER', showPartnerPrompt: true },
    sections: { ...ready.sections, printPrices: true, partnerPrompt: true },
    services: { ...services, visible: true },
};

function renderScreen() {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <BusinessScreen />
        </NextIntlClientProvider>,
    );
}

describe('BusinessScreen', () => {
    afterEach(cleanup);

    it('tells an account that is no vendor what the page is for, inside the page', () => {
        page.value = { ...ready, overview: null, sections: null, notVendor: true };
        const { container } = renderScreen();
        expect(screen.getByRole('heading', { name: 'This page is for businesses' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Go to profile/ })).toHaveAttribute('href', '/profile');
        expect(container.querySelector('main')).toBeNull();
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });

    it('offers a retry when the page fails to load, inside the page', () => {
        page.value = { ...ready, overview: null, sections: null, loadFailed: true };
        const { container } = renderScreen();
        expect(screen.getByRole('heading', { name: "Couldn't load this page" })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
        expect(ready.retry).toHaveBeenCalled();
        expect(container.querySelector('main')).toBeNull();
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });

    it('shows the sections a plain vendor gets, and leaves out empty ones', () => {
        page.value = ready;
        renderScreen();
        expect(screen.getByRole('heading', { name: 'My business' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'DJ Nikos' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Insights' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Your events' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Your content' })).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Print prices' })).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'How guests see you' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Contact us/ })).toBeInTheDocument();
    });

    it('shows a partner with no vendor data their name and earnings, and empty states', () => {
        page.value = {
            ...ready,
            overview: {
                partner: true,
                showPartnerPrompt: false,
                totals: { events: 0, guests: 0, listTaps: 0, proViews: 0, postViewers: 0, cardTaps: 0 },
                trend: [{ month: '2026-11', views: 0 }],
            },
            profile: null,
            needsProfile: true,
            name: 'Villa Rosa',
            earnings: { state: 'ready', balances: [{ currency: 'EUR', earnedMinor: 5000, paidMinor: 0, owedMinor: 5000 }], tierProgress: null },
            events: { ...ready.events, isEmpty: true },
        };
        renderScreen();
        expect(screen.getByRole('heading', { name: 'Villa Rosa' })).toBeInTheDocument();
        expect(screen.getByText('Partner')).toBeInTheDocument();
        expect(screen.getByText('To be paid')).toBeInTheDocument();
        expect(screen.getByText('No numbers yet')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Your events' })).toBeInTheDocument();
        expect(screen.getByText('No events yet')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Set up your business profile' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Become a partner' })).not.toBeInTheDocument();
    });

    it('shows a retry where the earnings would be when the partner data failed', () => {
        page.value = { ...ready, overview: { ...ready.overview, partner: true }, earnings: { state: 'failed' } };
        renderScreen();
        expect(screen.getByText("Couldn't load your earnings.")).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(ready.retryEarnings).toHaveBeenCalled();
    });

    it('shows "Become a partner" once when the server says so, even with print prices on the page', () => {
        page.value = photographer;
        renderScreen();
        expect(screen.getByRole('heading', { name: 'Print prices' })).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: 'Become a partner' })).toHaveLength(1);
    });

    it('shows no "Become a partner" when the server says not to', () => {
        page.value = {
            ...photographer,
            overview: { ...photographer.overview, showPartnerPrompt: false },
            sections: { ...photographer.sections, partnerPrompt: false },
        };
        renderScreen();
        expect(screen.queryByRole('button', { name: 'Become a partner' })).not.toBeInTheDocument();
    });

    it('keeps Edit off while the profile loads, and shows no setup card yet', () => {
        page.value = { ...ready, profile: null, name: null, profileState: 'loading' };
        renderScreen();
        expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
        expect(screen.queryByRole('heading', { name: 'Set up your business profile' })).not.toBeInTheDocument();
    });

    it('offers to set up a missing profile, and opens the details sheet', () => {
        page.value = { ...ready, profile: null, name: null, needsProfile: true };
        renderScreen();
        expect(screen.getByRole('heading', { name: 'Set up your business profile' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Set up' }));
        expect(ready.openProfile).toHaveBeenCalled();
    });

    it('shows no setup card once there is a profile', () => {
        page.value = ready;
        renderScreen();
        expect(screen.queryByRole('heading', { name: 'Set up your business profile' })).not.toBeInTheDocument();
    });
});
