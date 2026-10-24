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
        included: 1,
        items,
        removedCount: 0,
        totals: printTotals(items, 1),
        partCount: 1,
        downloadingPart: null,
        isLoadingParts: false,
        isLoading: false,
        isLoadingIncluded: false,
        loadFailed: false,
        error: null,
        onEditIncludedAction: vi.fn(),
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

    it('shows the included count once, formatted, on the Change button', () => {
        const props = renderSection({ included: 1200, totals: printTotals(items, 1200) });
        const change = screen.getByRole('button', { name: 'Change prints included for the host' });
        expect(change).toHaveTextContent('1,200');
        expect(screen.queryByText(/included$/)).not.toBeInTheDocument();
        fireEvent.click(change);
        expect(props.onEditIncludedAction).toHaveBeenCalled();
    });

    it('leaves the included part out of the total line', () => {
        renderSection({ included: 1, totals: printTotals(items, 1) });
        expect(screen.getByText('1 more · €3.00')).toBeInTheDocument();
        expect(screen.queryByText(/of 1 included/)).not.toBeInTheDocument();
    });

    it('shows no total line when the package covers every copy', () => {
        renderSection({ included: 5, totals: printTotals(items, 5) });
        expect(screen.queryByText(/more/)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    });

    it('shows a skeleton instead of the count while the package loads', () => {
        renderSection({ isLoadingIncluded: true });
        expect(screen.queryByRole('button', { name: 'Change prints included for the host' })).not.toBeInTheDocument();
        expect(screen.getByRole('status')).toBeInTheDocument();
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
        renderSection({ included: 0, items: [], totals: printTotals([], 0), partCount: 0 });
        expect(screen.getByText("The host hasn't picked photos yet.")).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
    });

    it('shows the error instead of an empty list or a count when the read failed', () => {
        renderSection({ loadFailed: true, error: 'Nope', included: 0, items: [], totals: printTotals([], 0) });
        expect(screen.getByRole('alert')).toHaveTextContent('Nope');
        expect(screen.queryByText("The host hasn't picked photos yet.")).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Change prints included for the host' })).not.toBeInTheDocument();
    });

    it('shows an error as an alert', () => {
        renderSection({ error: 'Nope' });
        expect(screen.getByRole('alert')).toHaveTextContent('Nope');
    });
});
