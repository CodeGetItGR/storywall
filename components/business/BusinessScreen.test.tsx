import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BusinessScreen } from '@/components/business/BusinessScreen';
import messages from '@/messages/en.json';

const page = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('@/hooks/useBusinessPage', () => ({ useBusinessPage: () => page.value }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { email: 'nikos@example.com' } }) }));
vi.mock('@/components/business/BusinessTrendChart', () => ({ BusinessTrendChart: () => null }));
vi.mock('@/components/vendors/BecomePartnerSheet', () => ({ BecomePartnerSheet: () => null }));
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
    overview: { partner: false, vendorType: 'MUSIC', totals: { events: 1, guests: 10, listTaps: 0 }, trend: null, content: null },
    sections: { content: false, printPrices: false, feedCard: false, sneakPeekSample: false, previews: false },
    profile: { businessName: 'DJ Nikos', logoUrl: null, vendorType: 'MUSIC' },
    balances: null,
    tierProgress: null,
    cardPreview: null,
    events: { events: [], isLoading: false, loadFailed: false, hasMore: false, isLoadingMore: false, loadMore: vi.fn(), retry: vi.fn() },
    services,
    contact,
    becomePartner: { sheetOpen: false, openSheet: vi.fn(), closeSheet: vi.fn(), defaults: {}, search: '' },
    profileOpen: false,
    openProfile: vi.fn(),
    closeProfile: vi.fn(),
};

function renderScreen() {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <BusinessScreen />
        </NextIntlClientProvider>,
    );
}

describe('BusinessScreen', () => {
    afterEach(cleanup);

    it('tells an account that is no vendor what the page is for', () => {
        page.value = { ...ready, overview: null, sections: null, notVendor: true };
        renderScreen();
        expect(screen.getByText('This page is for businesses working at events')).toBeInTheDocument();
    });

    it('offers a retry when the page fails to load', () => {
        page.value = { ...ready, overview: null, sections: null, loadFailed: true };
        renderScreen();
        expect(screen.getByText("Couldn't load this page")).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Try again/ })).toBeInTheDocument();
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
});
