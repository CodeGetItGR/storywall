import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminDrawer } from '@/components/admin/AdminDrawer';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

async function renderDrawer(onClose: () => void, closeDisabled?: boolean) {
    render(
        <AdminDrawer open onClose={onClose} title="Font" closeLabel="Close" closeDisabled={closeDisabled}>
            <p>body</p>
        </AdminDrawer>,
    );
    // Overlay history registers in a microtask.
    await act(async () => {
        await Promise.resolve();
    });
}

describe('AdminDrawer closeDisabled', () => {
    it('ignores Esc and leaves its history entry alone while close is disabled', async () => {
        const onClose = vi.fn();
        await renderDrawer(onClose, true);
        const stateBefore = window.history.state;
        const replaceState = vi.spyOn(window.history, 'replaceState');
        const back = vi.spyOn(window.history, 'back');

        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

        expect(onClose).not.toHaveBeenCalled();
        expect(replaceState).not.toHaveBeenCalled();
        expect(back).not.toHaveBeenCalled();
        expect(window.history.state).toEqual(stateBefore);
        expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    });

    it('closes on Esc by default', async () => {
        const onClose = vi.fn();
        await renderDrawer(onClose);
        // Same spy as the disabled case: proves it does see the drawer clear its history entry.
        const replaceState = vi.spyOn(window.history, 'replaceState');

        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

        expect(onClose).toHaveBeenCalledOnce();
        expect(replaceState).toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
});

describe('AdminDrawer onClosed', () => {
    function drawer(open: boolean, onClosed: () => void) {
        return (
            <AdminDrawer open={open} onClose={vi.fn()} onClosed={onClosed} title="Font" closeLabel="Close">
                <p>body</p>
            </AdminDrawer>
        );
    }

    it('fires once the drawer has closed, not when it opens or stays closed', async () => {
        const onClosed = vi.fn();
        const { rerender } = render(drawer(false, onClosed));
        rerender(drawer(true, onClosed));
        await act(async () => {
            await Promise.resolve();
        });
        expect(onClosed).not.toHaveBeenCalled();

        rerender(drawer(false, onClosed));

        await waitFor(() => expect(onClosed).toHaveBeenCalledOnce());
    });
});
