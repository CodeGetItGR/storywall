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

    it('shows the rows, a removed photo and the total line', () => {
        renderSheet();
        expect(screen.getByText('Photo removed')).toBeInTheDocument();
        expect(screen.getByText(/^1 of 1 included · 1 more · /)).toBeInTheDocument();
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
});
