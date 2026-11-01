import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BusinessHero } from '@/components/business/BusinessHero';
import messages from '@/messages/en.json';

function renderHero(overrides: Partial<React.ComponentProps<typeof BusinessHero>> = {}) {
    const props = {
        name: 'Studio Lumen',
        logoUrl: null,
        vendorType: 'PHOTOGRAPHER' as const,
        partner: false,
        profileState: 'ready' as const,
        onEditAction: vi.fn(),
        onRetryProfileAction: vi.fn(),
        ...overrides,
    };
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <BusinessHero {...props} />
        </NextIntlClientProvider>,
    );
    return props;
}

describe('BusinessHero', () => {
    afterEach(cleanup);

    it('shows the business name and type', () => {
        renderHero();
        expect(screen.getByRole('heading', { name: 'Studio Lumen' })).toBeInTheDocument();
        expect(screen.getByText('Photographer')).toBeInTheDocument();
    });

    it('shows the Partner pill and the earnings passed in for a partner', () => {
        renderHero({ partner: true, children: <p>earnings</p> });
        expect(screen.getByText('Partner')).toBeInTheDocument();
        expect(screen.getByText('earnings')).toBeInTheDocument();
    });

    it('shows no Partner pill for a non-partner', () => {
        renderHero();
        expect(screen.queryByText('Partner')).toBeNull();
    });

    it('calls onEditAction from the Edit button once the details loaded', () => {
        const { onEditAction } = renderHero();
        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
        expect(onEditAction).toHaveBeenCalledTimes(1);
    });

    it('keeps Edit off while the details load', () => {
        const { onEditAction } = renderHero({ profileState: 'loading' });
        const edit = screen.getByRole('button', { name: 'Edit' });
        expect(edit).toBeDisabled();
        fireEvent.click(edit);
        expect(onEditAction).not.toHaveBeenCalled();
    });

    it('offers a retry in place of Edit when the details failed to load', () => {
        const { onRetryProfileAction } = renderHero({ profileState: 'failed' });
        expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Reload details' }));
        expect(onRetryProfileAction).toHaveBeenCalledTimes(1);
    });

    it('falls back to "Your business" without a name, and shows no type without one', () => {
        renderHero({ name: null, vendorType: null });
        expect(screen.getByRole('heading', { name: 'Your business' })).toBeInTheDocument();
        expect(screen.queryByText('Photographer')).toBeNull();
    });
});
