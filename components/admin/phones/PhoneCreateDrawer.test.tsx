import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PhoneCreateDrawer } from '@/components/admin/phones/PhoneCreateDrawer';

const hooks = vi.hoisted(() => ({ create: vi.fn(), reset: vi.fn() }));

// Keys come back as-is, with any values after a colon.
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${Object.values(values).join(',')}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/components/admin/AdminDrawer', () => ({
    AdminDrawer: ({ open, title, children, footer }: { open: boolean; title: ReactNode; children: ReactNode; footer: ReactNode }) =>
        open ? (
            <div data-testid="admin-drawer">
                <h2>{title}</h2>
                {children}
                {footer}
            </div>
        ) : null,
}));
vi.mock('@/hooks/useAdminDevices', () => ({
    useCreateAdminDevice: () => ({ mutateAsync: hooks.create, reset: hooks.reset, isPending: false }),
}));

beforeEach(() => {
    hooks.reset.mockReset();
    hooks.create.mockReset().mockResolvedValue({
        device: { id: 'd1', name: 'Galaxy', createdAt: '2026-10-28T08:00:00Z', lastSeenAt: null, pushEnabled: false },
        key: 'secret-key',
    });
});
afterEach(cleanup);

describe('PhoneCreateDrawer', () => {
    it('does not pair without a name', () => {
        render(<PhoneCreateDrawer open onCloseAction={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('phones.fields.name'), { target: { value: '   ' } });
        fireEvent.click(screen.getByRole('button', { name: 'phones.create' }));

        expect(screen.getByText('phones.problems.name')).toBeInTheDocument();
        expect(hooks.create).not.toHaveBeenCalled();
    });

    it('pairs with the trimmed name and shows the code without printing the key', async () => {
        const onClose = vi.fn();
        render(<PhoneCreateDrawer open onCloseAction={onClose} />);
        fireEvent.change(screen.getByLabelText('phones.fields.name'), { target: { value: ' Galaxy ' } });
        fireEvent.click(screen.getByRole('button', { name: 'phones.create' }));

        await waitFor(() => expect(screen.getByRole('img', { name: 'qrLabel:Galaxy' })).toBeInTheDocument());
        expect(hooks.create).toHaveBeenCalledWith({ name: 'Galaxy' });
        // innerHTML, not textContent: the key must not sit in an attribute either.
        expect(document.body.innerHTML).not.toContain('secret-key');
        // The finished mutation is detached, so React Query keeps no copy of the key.
        expect(hooks.reset).toHaveBeenCalledOnce();

        fireEvent.click(screen.getByRole('button', { name: 'phones.done' }));
        expect(onClose).toHaveBeenCalled();
    });

    it('shows the error and no code when pairing fails', async () => {
        hooks.create.mockRejectedValue(new Error('x'));
        render(<PhoneCreateDrawer open onCloseAction={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('phones.fields.name'), { target: { value: 'Galaxy' } });
        fireEvent.click(screen.getByRole('button', { name: 'phones.create' }));

        // A plain Error maps to the generic message.
        expect(await screen.findByText('errors.generic')).toBeInTheDocument();
        expect(screen.queryByRole('img')).toBeNull();
        expect(hooks.reset).not.toHaveBeenCalled();
    });

    it('creates one phone when the form is submitted twice before the first finishes', async () => {
        hooks.create.mockReturnValue(new Promise(() => {}));
        render(<PhoneCreateDrawer open onCloseAction={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('phones.fields.name'), { target: { value: 'Galaxy' } });
        const form = screen.getByLabelText('phones.fields.name').closest('form')!;
        fireEvent.submit(form);
        fireEvent.submit(form);

        expect(hooks.create).toHaveBeenCalledOnce();
    });
});
