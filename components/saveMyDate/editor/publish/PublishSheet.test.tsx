import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PublishSheet } from '@/components/saveMyDate/editor/publish/PublishSheet';
import type { PublishSheetState } from '@/hooks/usePublishInvitation';
import en from '@/messages/en.json';

function renderSheet(state: Partial<PublishSheetState> = {}) {
    const sheet: PublishSheetState = {
        open: true,
        close: vi.fn(),
        value: '',
        setValue: vi.fn(),
        check: 'empty',
        canSubmit: false,
        isPublishing: false,
        failed: false,
        submit: vi.fn((event) => event.preventDefault()),
        ...state,
    };
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <PublishSheet sheet={sheet} inviteHost="invite.storywall.gr" />
        </NextIntlClientProvider>,
    );
    return { sheet, dialog: within(screen.getByRole('dialog', { name: 'Publish invitation' })) };
}

describe('PublishSheet', () => {
    afterEach(cleanup);

    it('shows the link under the invite host and lowercases what is typed', () => {
        const { sheet, dialog } = renderSheet();
        expect(dialog.getByText('invite.storywall.gr/')).toBeInTheDocument();

        fireEvent.change(dialog.getByLabelText('Invitation link'), { target: { value: 'Maria-Nikos' } });
        expect(sheet.setValue).toHaveBeenCalledWith('maria-nikos');
    });

    it('ties the check and the note to the field', () => {
        const { dialog } = renderSheet({ value: 'taken-link', check: 'taken' });
        const field = dialog.getByLabelText('Invitation link');
        expect(field).toHaveAttribute('aria-invalid', 'true');
        expect(field).toHaveAccessibleDescription(/Already taken/);
        expect(field).toHaveAccessibleDescription(/You can't change the link after publishing\./);
        expect(dialog.getByRole('button', { name: 'Publish' })).toBeDisabled();
    });

    it('publishes a free link', () => {
        const { sheet, dialog } = renderSheet({ value: 'maria-nikos', check: 'available', canSubmit: true });
        expect(dialog.getByLabelText('Invitation link')).not.toHaveAttribute('aria-invalid');
        fireEvent.click(dialog.getByRole('button', { name: 'Publish' }));
        expect(sheet.submit).toHaveBeenCalledOnce();
    });

    it('says when publishing failed', () => {
        const { dialog } = renderSheet({ value: 'maria-nikos', check: 'available', canSubmit: true, failed: true });
        expect(dialog.getByRole('alert')).toHaveTextContent('Publishing failed. Try again.');
    });

    it('cannot be cancelled while it publishes', () => {
        const { sheet, dialog } = renderSheet({ value: 'maria-nikos', check: 'available', isPublishing: true });
        const cancel = dialog.getByRole('button', { name: 'Cancel' });
        expect(cancel).toBeDisabled();
        fireEvent.click(cancel);
        expect(sheet.close).not.toHaveBeenCalled();
    });
});
