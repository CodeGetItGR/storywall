import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TextStylesPanel } from '@/components/admin/textStyles/TextStylesPanel';
import { endpoints } from '@/lib/api/endpoints';
import type { TextStylePresetDto } from '@/lib/api/types';
import en from '@/messages/en.json';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api,
}));
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));
vi.mock('@/hooks/useAdminInvitationThemes', () => ({ useInvitationFonts: () => ({ data: [] }) }));

const copy = en.AdminPage.textStyles;

function preset(id: string, sortOrder: number, patch: Partial<TextStylePresetDto> = {}): TextStylePresetDto {
    return {
        id,
        nameEn: id,
        nameEl: `${id}-el`,
        font: "'Playfair Display',serif",
        size: 40,
        weight: 'NORMAL',
        italic: false,
        letterSpacing: 0,
        uppercase: false,
        sortOrder,
        ...patch,
    };
}

beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset();
    api.get.mockResolvedValue([preset('Second', 1), preset('First', 0, { weight: 'BOLD', letterSpacing: 2 })]);
    api.patch.mockResolvedValue(undefined);
});

afterEach(cleanup);

function renderPanel() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <NextIntlClientProvider locale="en" messages={en}>
                <TextStylesPanel />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

describe('TextStylesPanel', () => {
    it('lists the presets in their order, with their look', async () => {
        renderPanel();
        const rows = await screen.findAllByRole('row');
        expect(api.get).toHaveBeenCalledWith(endpoints.admin.textStylePresets.list);
        // rows[0] is the header.
        expect(rows[1]).toHaveTextContent('First');
        expect(rows[2]).toHaveTextContent('Second');
        expect(within(rows[1]).getByText(copy.weight.bold)).toBeInTheDocument();
        expect(within(rows[1]).getByText('+2px')).toBeInTheDocument();
        expect(within(rows[1]).getByText('Playfair Display')).toBeInTheDocument();
    });

    it('opens the drawer empty for a new style', async () => {
        renderPanel();
        await screen.findAllByRole('row');
        fireEvent.click(screen.getByRole('button', { name: copy.create }));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByLabelText(copy.fields.nameEn, { exact: false })).toHaveValue('');
    });

    it('opens the drawer with the picked preset', async () => {
        renderPanel();
        await screen.findAllByRole('row');
        fireEvent.click(screen.getByRole('button', { name: en.AdminPage.themeFonts.edit.replace('{name}', 'Second') }));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByLabelText(copy.fields.nameEl, { exact: false })).toHaveValue('Second-el');
    });

    it('moves a preset down with its arrow', async () => {
        renderPanel();
        await screen.findAllByRole('row');
        fireEvent.click(screen.getByRole('button', { name: en.AdminPage.order.moveDown.replace('{name}', 'First') }));
        await waitFor(() => expect(api.patch).toHaveBeenCalled());
        expect(api.patch).toHaveBeenCalledWith(endpoints.admin.textStylePresets.byId('First'), { sortOrder: expect.any(Number) });
    });
});
