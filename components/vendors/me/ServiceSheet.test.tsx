import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ServiceSheet } from '@/components/vendors/me/ServiceSheet';
import messages from '@/messages/en.json';

const size = { id: 's1', kind: 'PRINT' as const, label: '13x18', priceCents: 350, currency: 'EUR', sortOrder: 0 };

function renderIntl(ui: ReactElement) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            {ui}
        </NextIntlClientProvider>,
    );
}

function renderSheet(item: Parameters<typeof ServiceSheet>[0]['item']) {
    const props = { item, isSaving: false, error: null, onSaveAction: vi.fn(), onDeleteAction: vi.fn(), onCloseAction: vi.fn() };
    renderIntl(<ServiceSheet {...props} />);
    return props;
}

afterEach(cleanup);

describe('ServiceSheet', () => {
    it('saves a new size with the price in cents', () => {
        const props = renderSheet('new');
        fireEvent.change(screen.getByLabelText('Size'), { target: { value: ' 10x15 ' } });
        fireEvent.change(screen.getByLabelText('Price per copy (€)'), { target: { value: '2,5' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(props.onSaveAction).toHaveBeenCalledWith('10x15', 250);
        expect(screen.queryByRole('button', { name: 'Delete size' })).not.toBeInTheDocument();
    });

    it('does not save without a size or with a bad price', () => {
        const props = renderSheet('new');
        fireEvent.change(screen.getByLabelText('Price per copy (€)'), { target: { value: '1001' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(props.onSaveAction).not.toHaveBeenCalled();
        expect(screen.getByText('Enter a size.')).toBeInTheDocument();
        expect(screen.getByText('Enter a price like 3.50.')).toBeInTheDocument();
    });

    it('edits a size and asks to delete it', () => {
        const props = renderSheet(size);
        expect(screen.getByLabelText('Price per copy (€)')).toHaveValue('3.50');
        fireEvent.click(screen.getByRole('button', { name: 'Delete size' }));
        expect(props.onDeleteAction).toHaveBeenCalled();
    });
});
