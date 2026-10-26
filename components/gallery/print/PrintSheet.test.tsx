import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PrintSheet } from '@/components/gallery/print/PrintSheet';
import type { PrintListItemDto, PrintPhotographerDto } from '@/lib/api/types';
import { printTotals } from '@/lib/printPicks';
import messages from '@/messages/en.json';

const photographers: PrintPhotographerDto[] = [
    {
        vendorId: 'v1',
        businessName: 'Lens & Light',
        logoUrl: null,
        accessEndsAt: '2026-12-01T00:00:00Z',
        hostPrintsIncluded: 1,
        sizes: [{ id: 's1', label: '13x18', priceCents: 300, currency: 'EUR' }],
    },
    { vendorId: 'v2', businessName: 'Studio Two', logoUrl: null, accessEndsAt: '2026-12-01T00:00:00Z', hostPrintsIncluded: 0, sizes: [] },
];
const items: PrintListItemDto[] = [
    { id: 'i1', mediaId: 'm1', media: null, removed: false, sizeId: 's1', sizeLabel: '13x18', unitPriceCents: 300, copies: 2 },
    { id: 'i2', mediaId: 'm2', media: null, removed: true, sizeId: 's1', sizeLabel: '13x18', unitPriceCents: 300, copies: 1 },
];

const size13 = photographers[0].sizes[0];

function renderSheet(overrides: Partial<Parameters<typeof PrintSheet>[0]> = {}) {
    const props = {
        open: true,
        photographers,
        photographer: photographers[0],
        items,
        totals: printTotals(items, 1),
        error: null,
        onSelectPhotographerAction: vi.fn(),
        onUpdateItemAction: vi.fn(),
        onRemoveItemAction: vi.fn(),
        onCloseAction: vi.fn(),
        ...overrides,
    };
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <PrintSheet {...props} />
        </NextIntlClientProvider>,
    );
    return props;
}

describe('PrintSheet', () => {
    afterEach(cleanup);

    it('shows the rows, a removed photo and the total', () => {
        renderSheet();
        expect(screen.getByText('Photo removed')).toBeInTheDocument();
        expect(screen.getByText('Included')).toBeInTheDocument();
        expect(screen.getByText('1 of 1')).toBeInTheDocument();
        expect(screen.getByText('1 more')).toBeInTheDocument();
        expect(screen.getByText('€3.00')).toBeInTheDocument();
    });

    it('says who sees the list', () => {
        renderSheet();
        expect(screen.getByText('Lens & Light sees this list.')).toBeInTheDocument();
    });

    it('shows each size with its price', () => {
        renderSheet();
        expect(screen.getByRole('option', { name: '13x18 · €3.00' })).toBeInTheDocument();
    });

    it('changes copies and removes a pick', () => {
        const props = renderSheet();
        fireEvent.click(screen.getAllByRole('button', { name: 'One copy more' })[0]);
        expect(props.onUpdateItemAction).toHaveBeenCalledWith('i1', { copies: 3 });
        fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
        expect(props.onRemoveItemAction).toHaveBeenCalledWith('i1');
    });

    it('switches photographer when there are two', () => {
        const props = renderSheet();
        fireEvent.click(screen.getByRole('button', { name: 'Studio Two' }));
        expect(props.onSelectPhotographerAction).toHaveBeenCalledWith('v2');
    });

    it('says the photographer sets the price without sizes', () => {
        const unpriced = [{ ...items[0], sizeId: null, sizeLabel: null, unitPriceCents: null }];
        renderSheet({ photographers: [photographers[1]], photographer: photographers[1], items: unpriced, totals: printTotals(unpriced, 0) });
        expect(screen.getByText(/Your photographer sets the price/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Lens & Light' })).not.toBeInTheDocument();
    });

    it('changes the size of a pick', () => {
        const twoSizes = { ...photographers[0], sizes: [size13, { id: 's2', label: '20x30', priceCents: 600, currency: 'EUR' }] };
        const props = renderSheet({ photographers: [twoSizes], photographer: twoSizes });
        fireEvent.change(screen.getByRole('combobox', { name: 'Size' }), { target: { value: 's2' } });
        expect(props.onUpdateItemAction).toHaveBeenCalledWith('i1', { sizeId: 's2' });
    });

    it('shows a placeholder when the pick has no size, and every size can be chosen', () => {
        const unsized = [{ ...items[0], sizeId: null, sizeLabel: null, unitPriceCents: null }];
        const props = renderSheet({ items: unsized, totals: printTotals(unsized, 1) });
        const select = screen.getByRole('combobox', { name: 'Size' }) as HTMLSelectElement;
        expect(select.value).toBe('');
        expect(screen.getByRole('option', { name: 'Size' })).toBeDisabled();
        fireEvent.change(select, { target: { value: 's1' } });
        expect(props.onUpdateItemAction).toHaveBeenCalledWith('i1', { sizeId: 's1' });
    });

    it('shows an error as an alert', () => {
        renderSheet({ error: 'Something went wrong' });
        expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    });

    it('shows a skeleton, not the empty state, while the list loads', () => {
        renderSheet({ items: [], totals: printTotals([], 1), isLoading: true });
        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.queryByText('Tap Select in the gallery, then Print.')).not.toBeInTheDocument();
    });

    it('shows the error, not the empty state, when the list could not be read', () => {
        renderSheet({ items: [], totals: printTotals([], 1), loadFailed: true, error: 'Something went wrong' });
        expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
        expect(screen.queryByText('Tap Select in the gallery, then Print.')).not.toBeInTheDocument();
    });

    it('shows the empty state without a total', () => {
        renderSheet({ items: [], totals: printTotals([], 1) });
        expect(screen.getByText('Tap Select in the gallery, then Print.')).toBeInTheDocument();
        expect(screen.queryByText('Included')).not.toBeInTheDocument();
    });

    it('leaves out the included part when the photographer includes none', () => {
        const none = [{ ...items[0] }];
        renderSheet({
            photographers: [photographers[0]],
            photographer: { ...photographers[0], hostPrintsIncluded: 0 },
            items: none,
            totals: printTotals(none, 0),
        });
        expect(screen.queryByText('Included')).not.toBeInTheDocument();
        expect(screen.getByText('2 more')).toBeInTheDocument();
    });
});
