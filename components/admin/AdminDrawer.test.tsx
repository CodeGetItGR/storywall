import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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

        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

        expect(onClose).toHaveBeenCalledOnce();
        expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
});
