import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PrintsIncludedRow } from '@/components/vendors/me/PrintsIncludedRow';
import messages from '@/messages/en.json';

function renderIntl(ui: ReactElement) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <ul>{ui}</ul>
        </NextIntlClientProvider>,
    );
}

afterEach(cleanup);

describe('PrintsIncludedRow', () => {
    it('shows the formatted count and opens the edit sheet', () => {
        const onEditAction = vi.fn();
        renderIntl(<PrintsIncludedRow included={1200} isLoading={false} onEditAction={onEditAction} />);
        const row = screen.getByRole('button', { name: /Prints included for the host/ });
        expect(row).toHaveTextContent('1,200');
        fireEvent.click(row);
        expect(onEditAction).toHaveBeenCalled();
    });

    it('shows a skeleton while the package loads', () => {
        renderIntl(<PrintsIncludedRow included={0} isLoading onEditAction={vi.fn()} />);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.getByRole('status')).toBeInTheDocument();
    });
});
