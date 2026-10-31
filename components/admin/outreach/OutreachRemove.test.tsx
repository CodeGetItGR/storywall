import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OutreachRemove } from '@/components/admin/outreach/OutreachRemove';

const hooks = vi.hoisted(() => ({ remove: vi.fn() }));

// Keys come back as-is.
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error-message' }));
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
vi.mock('@/hooks/useAdminOutreach', () => ({
    useDeleteOutreachProspect: () => ({ mutateAsync: hooks.remove, isPending: false }),
}));

describe('OutreachRemove', () => {
    beforeEach(() => hooks.remove.mockReset());
    afterEach(cleanup);

    it('asks in a dialog before removing, and removes on confirm', async () => {
        hooks.remove.mockResolvedValue(undefined);
        const onRemoved = vi.fn();
        render(<OutreachRemove prospectId="p1" onRemovedAction={onRemoved} />);

        fireEvent.click(screen.getByRole('button', { name: 'action' }));
        expect(screen.getByRole('dialog', { name: 'confirmTitle' })).toBeTruthy();
        expect(hooks.remove).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'confirm' }));
        await waitFor(() => expect(onRemoved).toHaveBeenCalled());
        expect(hooks.remove).toHaveBeenCalledWith('p1');
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('keeps the business when the dialog is cancelled', () => {
        render(<OutreachRemove prospectId="p1" onRemovedAction={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'action' }));
        fireEvent.click(screen.getByRole('button', { name: 'keep' }));

        expect(screen.queryByRole('dialog')).toBeNull();
        expect(hooks.remove).not.toHaveBeenCalled();
    });

    it('shows the refusal under the button when the removal fails', async () => {
        hooks.remove.mockRejectedValueOnce(new Error('nope'));
        const onRemoved = vi.fn();
        render(<OutreachRemove prospectId="p1" onRemovedAction={onRemoved} />);

        fireEvent.click(screen.getByRole('button', { name: 'action' }));
        fireEvent.click(screen.getByRole('button', { name: 'confirm' }));

        expect(await screen.findByRole('alert')).toBeTruthy();
        expect(onRemoved).not.toHaveBeenCalled();
    });
});
