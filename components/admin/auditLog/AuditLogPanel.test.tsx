import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditLogPanel } from '@/components/admin/auditLog/AuditLogPanel';
import { EventHistorySection } from '@/components/admin/events/EventHistorySection';
import type { Page } from '@/lib/api/pagination';
import type { AdminAuditLogResponseDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const server = vi.hoisted(() => ({ get: vi.fn(), entries: [] as unknown[], totalElements: 0 }));
vi.mock('@/lib/api/client', () => ({ api: { get: server.get } }));
vi.mock('@/hooks/useAdmin', () => ({
    useAdminPlatformModules: () => ({
        data: [{ id: 'm-1', moduleKey: 'vendors', name: 'Vendors', description: null, isEnabled: true, sortOrder: 0 }],
    }),
}));

const EVENT_ID = '3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const OTHER_EVENT = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

function entry(overrides: Partial<AdminAuditLogResponseDto>): AdminAuditLogResponseDto {
    return {
        id: 'log-1',
        adminUserId: 'admin-1',
        adminEmail: 'maria@storywall.gr',
        adminName: 'Maria',
        action: 'EVENT_MODULE_CONFIG_SET',
        targetType: 'EVENT',
        targetId: EVENT_ID,
        eventId: EVENT_ID,
        details: { moduleKey: 'vendors', configKey: 'maxVendors', previous: null, value: 1, reason: 'Only one vendor' },
        ipAddress: '10.0.0.1',
        createdAt: '2026-10-31T10:00:00Z',
        ...overrides,
    };
}

const ENTRIES = [
    entry({}),
    entry({
        id: 'log-2',
        adminUserId: 'admin-2',
        adminName: null,
        adminEmail: 'nikos@storywall.gr',
        action: 'EVENT_MODULE_CONFIG_SET',
        eventId: OTHER_EVENT,
        targetId: OTHER_EVENT,
        details: { moduleKey: 'vendors', configKey: 'allowedTypes', previous: ['PLANNER', 'MUSIC'], value: ['VENUE'], reason: 'Venue only' },
    }),
    entry({
        id: 'log-3',
        action: 'EVENT_MODULE_CONFIG_RESET',
        details: { moduleKey: 'vendors', configKey: 'proStorageBytes', previous: 1073741824, reason: 'Back' },
    }),
    entry({
        id: 'log-4',
        action: 'EVENT_PROVISIONED',
        details: { title: 'Baptism', planTierCode: 'GRANT', moduleConfigs: [{ configKey: 'maxVendors' }] },
    }),
    entry({
        id: 'log-5',
        action: 'PLAN_MODULE_CONFIG_CHANGED',
        eventId: null,
        targetType: 'PLAN_TIER',
        details: { planTierCode: 'PRO', moduleKey: 'vendors', before: { maxVendors: 5 }, after: { maxVendors: 2 } },
    }),
    entry({ id: 'log-6', action: 'CONTENT_VIEWED', eventId: null, details: { postId: 'p-1' } }),
];

function page(content: unknown[], number: number, size: number, totalElements = content.length): Page<unknown> {
    return { content, page: { size, number, totalElements, totalPages: Math.max(1, Math.ceil(totalElements / size)) } };
}

function lastQuery() {
    const path = server.get.mock.calls.at(-1)?.[0] as string;
    return Object.fromEntries(new URLSearchParams(path.split('?')[1]));
}

function renderWithProviders(node: React.ReactNode) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                {node}
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    server.entries = ENTRIES;
    server.totalElements = ENTRIES.length;
    server.get.mockReset();
    server.get.mockImplementation(async (path: string) => {
        const params = new URLSearchParams(path.split('?')[1]);
        const size = Number(params.get('size'));
        const filtered = (server.entries as AdminAuditLogResponseDto[]).filter(
            (item) =>
                (!params.get('eventId') || item.eventId === params.get('eventId')) &&
                (!params.get('adminUserId') || item.adminUserId === params.get('adminUserId')) &&
                (!params.get('action') || item.action === params.get('action')),
        );
        const filteredOut = params.has('eventId') || params.has('adminUserId') || params.has('action');
        return page(filtered, Number(params.get('page')), size, filteredOut ? filtered.length : server.totalElements);
    });
});
afterEach(cleanup);

describe('AuditLogPanel', () => {
    it('asks for the newest page and lists every action in words', async () => {
        renderWithProviders(<AuditLogPanel />);
        expect(await screen.findByText('Vendors · Max vendors: Plan\'s → 1')).toBeInTheDocument();
        expect(lastQuery()).toEqual({ page: '0', size: '50' });

        expect(screen.getByText('Vendors · Vendor types: Planner, Music → Venue')).toBeInTheDocument();
        expect(screen.getByText("Vendors · Pro storage: back to the plan's")).toBeInTheDocument();
        expect(screen.getByText('Baptism · GRANT · 1 setting changed')).toBeInTheDocument();
        expect(screen.getByText('PRO · Vendors: Max vendors: 5 → 2')).toBeInTheDocument();
        // An action without a summary still opens.
        expect(screen.getByRole('button', { name: 'Open details' })).toBeInTheDocument();
        expect(screen.getByText('Only one vendor')).toBeInTheDocument();
        expect(screen.getAllByText('Maria').length).toBeGreaterThan(0);
        expect(screen.getByText('nikos@storywall.gr')).toBeInTheDocument();
        expect(screen.getByText('6 actions')).toBeInTheDocument();
    });

    it('filters by action and goes back to the first page', async () => {
        renderWithProviders(<AuditLogPanel />);
        await screen.findByText('6 actions');
        fireEvent.change(screen.getByRole('combobox', { name: 'Action' }), { target: { value: 'EVENT_PROVISIONED' } });
        await waitFor(() => expect(lastQuery()).toEqual({ page: '0', size: '50', action: 'EVENT_PROVISIONED' }));
        expect(await screen.findByText('1 action')).toBeInTheDocument();

        fireEvent.change(screen.getByRole('combobox', { name: 'Action' }), { target: { value: '' } });
        await waitFor(() => expect(lastQuery()).toEqual({ page: '0', size: '50' }));
    });

    it('filters by an event id only once it is a full id', async () => {
        renderWithProviders(<AuditLogPanel />);
        await screen.findByText('6 actions');
        const input = screen.getByRole('searchbox', { name: 'Event id' });
        fireEvent.change(input, { target: { value: '3f2b1c4d' } });
        expect(screen.getByText('Paste a full event id.')).toBeInTheDocument();
        expect(lastQuery()).toEqual({ page: '0', size: '50' });

        fireEvent.change(input, { target: { value: ` ${OTHER_EVENT.toUpperCase()} ` } });
        await waitFor(() => expect(lastQuery()).toEqual({ page: '0', size: '50', eventId: OTHER_EVENT }));
        expect(screen.queryByText('Paste a full event id.')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Clear event' }));
        await waitFor(() => expect(lastQuery()).toEqual({ page: '0', size: '50' }));
    });

    it('filters by the admin or the event picked from a row', async () => {
        renderWithProviders(<AuditLogPanel />);
        await screen.findByText('6 actions');
        fireEvent.click(screen.getByRole('button', { name: 'nikos@storywall.gr' }));
        await waitFor(() => expect(lastQuery()).toEqual({ page: '0', size: '50', adminUserId: 'admin-2' }));
        expect(screen.getByText('Admin: nikos@storywall.gr')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Show every admin' }));
        await waitFor(() => expect(lastQuery()).toEqual({ page: '0', size: '50' }));

        await screen.findByText('6 actions');
        fireEvent.click(screen.getByRole('button', { name: OTHER_EVENT.slice(0, 8) }));
        await waitFor(() => expect(lastQuery()).toEqual({ page: '0', size: '50', eventId: OTHER_EVENT }));
        expect(screen.getByRole('searchbox', { name: 'Event id' })).toHaveValue(OTHER_EVENT);
    });

    it('says when nothing matches the filters', async () => {
        renderWithProviders(<AuditLogPanel />);
        await screen.findByText('6 actions');
        fireEvent.change(screen.getByRole('combobox', { name: 'Action' }), { target: { value: 'ACCOUNT_DELETED' } });
        expect(await screen.findByText('No admin actions match these filters.')).toBeInTheDocument();
    });

    it('says when there are no actions at all', async () => {
        server.entries = [];
        server.totalElements = 0;
        renderWithProviders(<AuditLogPanel />);
        expect(await screen.findByText('No admin actions yet.')).toBeInTheDocument();
    });

    it('opens an entry with who, when, the reason and every detail', async () => {
        renderWithProviders(<AuditLogPanel />);
        fireEvent.click(await screen.findByText('Vendors · Vendor types: Planner, Music → Venue'));
        const drawer = await screen.findByRole('dialog');
        expect(within(drawer).getByText('Reason: Venue only')).toBeInTheDocument();
        expect(within(drawer).getByText('nikos@storywall.gr')).toBeInTheDocument();
        expect(within(drawer).getByText('10.0.0.1')).toBeInTheDocument();
        expect(within(drawer).getByText('["PLANNER","MUSIC"]')).toBeInTheDocument();
        expect(within(drawer).getByText('["VENUE"]')).toBeInTheDocument();
        expect(within(drawer).queryByText('reason')).toBeNull();
        expect(within(drawer).getByRole('link', { name: 'Open event' })).toHaveAttribute('href', expect.stringContaining(OTHER_EVENT));
    });

    it('pages through the log', async () => {
        server.totalElements = 120;
        renderWithProviders(<AuditLogPanel />);
        await screen.findByText('120 actions');
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
        await waitFor(() => expect(lastQuery()).toEqual({ page: '1', size: '50' }));
    });
});

describe('EventHistorySection', () => {
    it("lists only this event's actions, ten at a time, and opens one", async () => {
        renderWithProviders(<EventHistorySection eventId={EVENT_ID} />);
        expect(await screen.findByText("Vendors · Max vendors: Plan's → 1")).toBeInTheDocument();
        expect(lastQuery()).toEqual({ page: '0', size: '10', eventId: EVENT_ID });
        expect(screen.queryByText('Vendors · Vendor types: Planner, Music → Venue')).toBeNull();

        fireEvent.click(screen.getByText("Vendors · Pro storage: back to the plan's"));
        const drawer = await screen.findByRole('dialog');
        expect(within(drawer).getByText('Reason: Back')).toBeInTheDocument();
    });

    it('says when the event has no admin actions', async () => {
        renderWithProviders(<EventHistorySection eventId="00000000-0000-4000-8000-000000000000" />);
        expect(await screen.findByText('No admin actions on this event yet.')).toBeInTheDocument();
    });
});
