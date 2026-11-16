import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WishEditSheet } from '@/components/wishbook/WishEditSheet';
import type { WishEditor } from '@/hooks/useWishEditor';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));

function editor(overrides: Partial<WishEditor> = {}): WishEditor {
    return {
        draft: 'Hello',
        changeDraft: vi.fn(),
        canSave: true,
        isSaving: false,
        saveError: null,
        isSheetOpen: true,
        isConfirmingDelete: false,
        isDeleting: false,
        open: vi.fn(),
        close: vi.fn(),
        save: vi.fn(),
        askDelete: vi.fn(),
        cancelDelete: vi.fn(),
        confirmDelete: vi.fn(),
        ...overrides,
    };
}

afterEach(cleanup);

describe('WishEditSheet', () => {
    it('edits the draft and saves', () => {
        const e = editor();
        render(<WishEditSheet editor={e} maxLength={2000} />);

        fireEvent.change(screen.getByRole('textbox', { name: 'messageAriaLabel' }), { target: { value: 'Hello there' } });
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        expect(e.changeDraft).toHaveBeenCalledWith('Hello there');
        expect(e.save).toHaveBeenCalled();
    });

    it('cuts the draft at the limit', () => {
        const e = editor();
        render(<WishEditSheet editor={e} maxLength={5} />);

        fireEvent.change(screen.getByRole('textbox', { name: 'messageAriaLabel' }), { target: { value: 'Hello there' } });

        expect(e.changeDraft).toHaveBeenCalledWith('Hello');
    });

    it('disables Save when there is nothing to save', () => {
        render(<WishEditSheet editor={editor({ canSave: false })} maxLength={2000} />);
        expect((screen.getByRole('button', { name: 'save' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('asks before deleting', () => {
        const e = editor();
        render(<WishEditSheet editor={e} maxLength={2000} />);

        fireEvent.click(screen.getByRole('button', { name: 'delete' }));

        expect(e.askDelete).toHaveBeenCalled();
    });

    it('shows the delete confirmation instead of the sheet', () => {
        const e = editor({ isSheetOpen: false, isConfirmingDelete: true });
        render(<WishEditSheet editor={e} maxLength={2000} />);

        expect(screen.queryByRole('textbox', { name: 'messageAriaLabel' })).toBeNull();
        expect(screen.getByText('deleteTitle')).toBeTruthy();
    });

    it('shows a save error', () => {
        render(<WishEditSheet editor={editor({ saveError: new Error('x') })} maxLength={2000} />);
        expect(screen.getByRole('alert').textContent).toBe('error');
    });
});
