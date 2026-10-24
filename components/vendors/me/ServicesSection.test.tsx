import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ServicesSection } from '@/components/vendors/me/ServicesSection';
import messages from '@/messages/en.json';

const size = { id: 's1', kind: 'PRINT' as const, label: '13x18', priceCents: 350, currency: 'EUR', sortOrder: 0 };

function renderIntl(ui: ReactElement) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            {ui}
        </NextIntlClientProvider>,
    );
}

afterEach(cleanup);

describe('ServicesSection', () => {
    it('lists sizes with prices and opens one to edit', () => {
        const onEditAction = vi.fn();
        renderIntl(
            <ServicesSection
                approved
                sizes={[size]}
                canAdd
                isLoading={false}
                loadFailed={false}
                error={null}
                onAddAction={vi.fn()}
                onEditAction={onEditAction}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: /13x18/ }));
        expect(onEditAction).toHaveBeenCalledWith(size);
        expect(screen.getByText('€3.50')).toBeInTheDocument();
    });

    it('adds a size', () => {
        const onAddAction = vi.fn();
        renderIntl(
            <ServicesSection
                approved
                sizes={[]}
                canAdd
                isLoading={false}
                loadFailed={false}
                error={null}
                onAddAction={onAddAction}
                onEditAction={vi.fn()}
            />,
        );
        expect(screen.getByText('No sizes yet.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Add size' }));
        expect(onAddAction).toHaveBeenCalled();
    });

    it('turns Add off at the limit and says why', () => {
        renderIntl(
            <ServicesSection
                approved
                sizes={[size]}
                canAdd={false}
                isLoading={false}
                loadFailed={false}
                error={null}
                onAddAction={vi.fn()}
                onEditAction={vi.fn()}
            />,
        );
        expect(screen.getByRole('button', { name: 'Add size' })).toBeDisabled();
        expect(screen.getByText('You can list up to 8 sizes.')).toBeInTheDocument();
    });

    it('shows one line to vendors who are not approved partners', () => {
        renderIntl(
            <ServicesSection
                approved={false}
                sizes={[]}
                canAdd
                isLoading={false}
                loadFailed={false}
                error={null}
                onAddAction={vi.fn()}
                onEditAction={vi.fn()}
            />,
        );
        expect(screen.getByText('Only approved partners can list prices.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Add size' })).not.toBeInTheDocument();
    });

    it('shows an error as an alert', () => {
        renderIntl(
            <ServicesSection
                approved
                sizes={[size]}
                canAdd
                isLoading={false}
                loadFailed={false}
                error="Nope"
                onAddAction={vi.fn()}
                onEditAction={vi.fn()}
            />,
        );
        expect(screen.getByRole('alert')).toHaveTextContent('Nope');
    });
});
