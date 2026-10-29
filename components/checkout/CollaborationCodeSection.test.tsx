import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CollaborationCodeSection } from '@/components/checkout/CollaborationCodeSection';
import { readPartnerCode, savePartnerCode } from '@/lib/partnerCodeLink';

const preview = vi.hoisted(() => ({
    mutateAsync: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    data: undefined as unknown,
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => 'en',
}));
vi.mock('@/hooks/useBilling', () => ({ usePreviewCollaborationCode: () => preview }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'invalid' }));

function renderSection(props: { disabled?: boolean } = {}) {
    return render(<CollaborationCodeSection collapsible eventId="event-1" onPreviewChangeAction={vi.fn()} {...props} />);
}

beforeEach(() => {
    preview.mutateAsync.mockReset();
    preview.reset.mockReset();
});

afterEach(() => {
    cleanup();
    localStorage.clear();
});

describe('CollaborationCodeSection with a code from a partner link', () => {
    it('opens with the code filled in and applies it', async () => {
        savePartnerCode('CARDS10');
        preview.mutateAsync.mockResolvedValue({});
        renderSection();

        expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('CARDS10');
        await waitFor(() => expect(preview.mutateAsync).toHaveBeenCalledWith({ collaborationCode: 'CARDS10' }));
    });

    it('waits until checkout is enabled before applying it', async () => {
        savePartnerCode('CARDS10');
        preview.mutateAsync.mockResolvedValue({});
        const { rerender } = renderSection({ disabled: true });
        expect(preview.mutateAsync).not.toHaveBeenCalled();

        rerender(<CollaborationCodeSection collapsible eventId="event-1" onPreviewChangeAction={vi.fn()} />);
        await waitFor(() => expect(preview.mutateAsync).toHaveBeenCalledTimes(1));
    });

    it('forgets a code the backend refuses', async () => {
        savePartnerCode('DEAD');
        preview.mutateAsync.mockRejectedValue(new Error('5060'));
        renderSection();

        await screen.findByText('invalid');
        expect(readPartnerCode()).toBeNull();
    });

    it('forgets the code when the host closes the field', async () => {
        savePartnerCode('CARDS10');
        preview.mutateAsync.mockResolvedValue({});
        renderSection();
        await waitFor(() => expect(preview.mutateAsync).toHaveBeenCalled());

        fireEvent.click(screen.getByRole('button', { name: 'close' }));
        expect(readPartnerCode()).toBeNull();
    });

    it('stays a closed link when no code was saved', () => {
        renderSection();
        expect(screen.queryByRole('textbox')).toBeNull();
        expect(preview.mutateAsync).not.toHaveBeenCalled();
    });
});
