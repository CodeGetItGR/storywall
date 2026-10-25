import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PrintsSection } from '@/components/vendors/me/PrintsSection';
import type { PrintListItemDto } from '@/lib/api/types';
import { printTotals } from '@/lib/printPicks';
import messages from '@/messages/en.json';

const items: PrintListItemDto[] = [
    { id: 'i1', mediaId: 'm1', media: null, removed: false, sizeId: 's1', sizeLabel: '13x18', unitPriceCents: 300, copies: 2 },
];

function renderIntl(ui: ReactElement) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            {ui}
        </NextIntlClientProvider>,
    );
}

function renderSection(overrides: Partial<Parameters<typeof PrintsSection>[0]> = {}) {
    const props = {
        items,
        removedCount: 0,
        totals: printTotals(items, 1),
        partCount: 1,
        downloadingPart: null,
        isLoadingParts: false,
        isLoading: false,
        isLoadingIncluded: false,
        listFailed: false,
        includedFailed: false,
        error: null,
        onDownloadPartAction: vi.fn(),
        ...overrides,
    };
    renderIntl(<PrintsSection {...props} />);
    return props;
}

afterEach(cleanup);

describe('PrintsSection', () => {
    it('shows the host picks, the removed count and the download', () => {
        const props = renderSection({ removedCount: 1 });
        expect(screen.getByText('13x18 · 2 copies')).toBeInTheDocument();
        expect(screen.getByText('1 photo removed')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Download' }));
        expect(props.onDownloadPartAction).toHaveBeenCalledWith(1);
    });

    it('shows the total against the package, with no way to change the package here', () => {
        renderSection({ totals: printTotals(items, 1) });
        expect(screen.getByText('1 of 1 included · 1 more · €3.00')).toBeInTheDocument();
        expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    it('says no price is set, not that the photographer sets it, when a size has no price', () => {
        const unpriced = [{ ...items[0], sizeId: null, sizeLabel: null, unitPriceCents: null }];
        renderSection({ items: unpriced, totals: printTotals(unpriced, 0) });
        expect(screen.getByText('2 more · No price set')).toBeInTheDocument();
        expect(screen.queryByText(/Your photographer sets the price/)).not.toBeInTheDocument();
    });

    it('shows only the included part when the package covers every copy', () => {
        renderSection({ totals: printTotals(items, 5) });
        expect(screen.getByText('2 of 5 included')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    });

    it('holds the total back while the package loads', () => {
        renderSection({ isLoadingIncluded: true });
        expect(screen.queryByText(/included/)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    });

    it('shows a disabled Download while the parts load', () => {
        renderSection({ partCount: 0, isLoadingParts: true });
        expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();
    });

    it('offers one button per part when the zip has several', () => {
        const props = renderSection({ partCount: 2 });
        fireEvent.click(screen.getByRole('button', { name: 'Part 2 of 2' }));
        expect(props.onDownloadPartAction).toHaveBeenCalledWith(2);
    });

    it('shows the part being downloaded and turns the other parts off', () => {
        renderSection({ partCount: 2, downloadingPart: 1 });
        expect(screen.getByRole('button', { name: 'Downloading…' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Part 2 of 2' })).toBeDisabled();
    });

    it('says when the host has picked nothing', () => {
        renderSection({ items: [], totals: printTotals([], 0), partCount: 0 });
        expect(screen.getByText("The host hasn't picked photos yet.")).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
    });

    it('shows the error instead of an empty list when the list read failed', () => {
        renderSection({ listFailed: true, error: 'Nope', items: [], totals: printTotals([], 0) });
        expect(screen.getByRole('alert')).toHaveTextContent('Nope');
        expect(screen.queryByText("The host hasn't picked photos yet.")).not.toBeInTheDocument();
    });

    it('hides only the total when the package read failed', () => {
        renderSection({ includedFailed: true, error: 'Nope', totals: printTotals(items, 0) });
        expect(screen.getByText('13x18 · 2 copies')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
        expect(screen.queryByText(/more/)).not.toBeInTheDocument();
    });

    it('shows an error as an alert', () => {
        renderSection({ error: 'Nope' });
        expect(screen.getByRole('alert')).toHaveTextContent('Nope');
    });
});
