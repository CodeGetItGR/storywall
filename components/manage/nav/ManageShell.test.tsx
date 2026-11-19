// components/manage/nav/ManageShell.test.tsx
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ManageShell } from '@/components/manage/nav/ManageShell';
import type { ManageNav } from '@/hooks/useManageNav';
import messages from '@/messages/en.json';

vi.mock('@/components/routing/EventRouteGate', () => ({
    useEventRouteContext: () => ({ activeEvent: { id: 'e1', title: 'Maria & Nikos', status: 'ACTIVE' }, eventId: 'e1', isHost: true }),
}));
vi.mock('@/hooks/useManageSectionLabel', () => ({ useManageSectionLabel: () => (key: string) => `label:${key}` }));
vi.mock('@/components/manage/nav/ManageSidebar', () => ({ ManageSidebar: () => <div data-testid="sidebar" /> }));
vi.mock('@/components/manage/nav/ManageSectionList', () => ({ ManageSectionList: () => <div data-testid="section-list" /> }));
vi.mock('@/components/manage/nav/ManageSectionHeader', () => ({
    ManageSectionHeader: ({ title }: { title: string }) => <div data-testid="section-header">{title}</div>,
}));
vi.mock('@/components/ui/BackButton', () => ({ BackButton: () => <div data-testid="draft-back" /> }));

afterEach(cleanup);

function nav(overrides: Partial<ManageNav> = {}): ManageNav {
    return { eventId: 'e1', isDraft: false, groups: [], showDanger: false, ...overrides } as ManageNav;
}

function renderShell(active: Parameters<typeof ManageShell>[0]['active'], navOverrides: Partial<ManageNav> = {}) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <ManageShell nav={nav(navOverrides)} active={active}>
                <p>content</p>
            </ManageShell>
        </NextIntlClientProvider>,
    );
}

describe('ManageShell', () => {
    it('on the Overview: event title, sidebar and the mobile section list, no header B', () => {
        renderShell('overview');
        expect(screen.getByRole('heading', { level: 1, name: 'Maria & Nikos' })).toBeInTheDocument();
        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
        expect(screen.getByTestId('section-list')).toBeInTheDocument();
        expect(screen.queryByTestId('section-header')).toBeNull();
        expect(screen.getByText('content')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    });

    it('on any other page: header B with its title, no mobile section list', () => {
        renderShell('vendors');
        expect(screen.getByTestId('section-header')).toHaveTextContent('label:vendors');
        expect(screen.queryByTestId('section-list')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
        expect(screen.getByRole('heading', { level: 2, name: 'label:vendors' })).toBeInTheDocument();
    });

    it('on a draft: no nav at all, and a way back to the events', () => {
        renderShell('overview', { isDraft: true });
        expect(screen.queryByTestId('sidebar')).toBeNull();
        expect(screen.queryByTestId('section-list')).toBeNull();
        expect(screen.getByTestId('draft-back')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
    });
});
