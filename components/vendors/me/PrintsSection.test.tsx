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
    it('shows the included count, the host picks, the total and the download', () => {
        const props = renderSection({ removedCount: 1 });
        expect(screen.getByText('Prints included for the host')).toBeInTheDocument();
        expect(screen.getByText('13x18 · 2 copies')).toBeInTheDocument();
        expect(screen.getByText('1 photo removed')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Download' }));
        expect(props.onDownloadPartAction).toHaveBeenCalledWith(1);
    });

    it('opens the included sheet', () => {
        const props = renderSection();
        fireEvent.click(screen.getByRole('button', { name: /Change/ }));
        expect(props.onEditIncludedAction).toHaveBeenCalled();
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

    it('says when the host has picked nothing', () => {
        renderSection({ included: 0, items: [], totals: printTotals([], 0), partCount: 0 });
        expect(screen.getByText("The host hasn't picked photos yet.")).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
    });

    it('shows an error as an alert', () => {
        renderSection({ error: 'Nope' });
        expect(screen.getByRole('alert')).toHaveTextContent('Nope');
    });
});
