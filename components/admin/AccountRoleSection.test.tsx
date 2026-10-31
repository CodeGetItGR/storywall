import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountRoleSection } from '@/components/admin/AccountRoleSection';
import type { PlatformRole, UserResponseDto } from '@/lib/api/types';

const hooks = vi.hoisted(() => ({ update: vi.fn(), reset: vi.fn(), viewerRole: 'ADMIN' as string, error: null as unknown }));

// Keys come back as-is.
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error-message' }));
vi.mock('@/components/admin/AdminNavigationContext', () => ({ useAdminNavigation: () => ({ role: hooks.viewerRole }) }));
vi.mock('@/components/ui/ConfirmActionModal', () => ({
    ConfirmActionModal: ({
        open,
        title,
        body,
        confirmLabel,
        cancelLabel,
        onConfirmAction,
        onCloseAction,
    }: {
        open: boolean;
        title: string;
        body: ReactNode;
        confirmLabel: string;
        cancelLabel: string;
        onConfirmAction: () => void;
        onCloseAction: () => void;
    }) =>
        open ? (
            <div role="dialog" aria-label={title}>
                <p>{body}</p>
                <button type="button" onClick={onConfirmAction}>
                    {confirmLabel}
                </button>
                <button type="button" onClick={onCloseAction}>
                    {cancelLabel}
                </button>
            </div>
        ) : null,
}));
vi.mock('@/hooks/useAdminAccounts', () => ({
    useUpdateAdminAccountMutation: () => ({ mutateAsync: hooks.update, isPending: false, error: hooks.error, reset: hooks.reset }),
}));

function account(platformRole: PlatformRole): UserResponseDto {
    return { id: 'u1', platformRole } as UserResponseDto;
}

describe('AccountRoleSection', () => {
    beforeEach(() => {
        hooks.update.mockReset();
        hooks.reset.mockReset();
        hooks.viewerRole = 'ADMIN';
        hooks.error = null;
    });
    afterEach(cleanup);

    it('makes a user a marketing teammate after the confirmation', async () => {
        const updated = account('MARKETING');
        hooks.update.mockResolvedValue(updated);
        const onChanged = vi.fn();
        render(<AccountRoleSection account={account('USER')} onChangedAction={onChanged} />);

        fireEvent.click(screen.getByRole('button', { name: 'marketing' }));
        expect(screen.getByRole('dialog', { name: 'roleAccess.confirmMarketingTitle' })).toBeTruthy();
        expect(hooks.update).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'roleAccess.confirm' }));
        await waitFor(() => expect(onChanged).toHaveBeenCalledWith(updated));
        expect(hooks.update).toHaveBeenCalledWith({ id: 'u1', input: { platformRole: 'MARKETING' } });
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(screen.getByRole('status').textContent).toBe('detail.saved');
    });

    it('asks before taking marketing access away, and keeps the role when cancelled', () => {
        render(<AccountRoleSection account={account('MARKETING')} onChangedAction={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'user' }));
        expect(screen.getByRole('dialog', { name: 'roleAccess.confirmUserTitle' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'roleAccess.cancel' }));

        expect(screen.queryByRole('dialog')).toBeNull();
        expect(hooks.update).not.toHaveBeenCalled();
    });

    it('does nothing when the current role is chosen again', () => {
        render(<AccountRoleSection account={account('USER')} onChangedAction={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'user' }));

        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('shows admin and guest roles read-only', () => {
        render(<AccountRoleSection account={account('ADMIN')} onChangedAction={vi.fn()} />);

        expect(screen.getByText('role.ADMIN')).toBeTruthy();
        expect(screen.getByText('roleAccess.readOnlyHint')).toBeTruthy();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('is hidden from a viewer who is not an admin', () => {
        hooks.viewerRole = 'MARKETING';
        const { container } = render(<AccountRoleSection account={account('USER')} onChangedAction={vi.fn()} />);

        expect(container.innerHTML).toBe('');
    });

    it('shows the refusal under the control when the update fails', async () => {
        // The mutation keeps the error once the request is refused.
        hooks.update.mockImplementation(async () => {
            hooks.error = new Error('nope');
            throw hooks.error;
        });
        const onChanged = vi.fn();
        render(<AccountRoleSection account={account('USER')} onChangedAction={onChanged} />);

        fireEvent.click(screen.getByRole('button', { name: 'marketing' }));
        fireEvent.click(screen.getByRole('button', { name: 'roleAccess.confirm' }));

        expect((await screen.findByRole('alert')).textContent).toBe('error-message');
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(onChanged).not.toHaveBeenCalled();
    });
});
