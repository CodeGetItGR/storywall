import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GuestWishForm } from '@/components/qrGuest/GuestWishForm';
import { ApiError } from '@/lib/api/client';

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useQrWish', () => ({ useSendQrWish: () => ({ isPending: false, mutateAsync }) }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/hooks/useTermsVersion', () => ({ termsVersionQueryKey: ['legal', 'terms'], useTermsVersion: () => ({ data: '2026-10-04' }) }));
vi.mock('@/hooks/useCommunityGuidelinesVersion', () => ({
    communityGuidelinesQueryKey: ['legal', 'community-guidelines'],
    useCommunityGuidelinesVersion: () => ({ data: '2026-09-30' }),
}));
vi.mock('@/components/incident/IncidentPausedNote', () => ({ IncidentPausedNote: () => null }));
// The checkbox copy and links are covered by SignupAcceptanceCheckbox's own use at sign-up.
vi.mock('@/components/legal/SignupAcceptanceCheckbox', () => ({
    SignupAcceptanceCheckbox: (props: { minimumAge?: number; checked: boolean; onChangeAction: () => void }) => (
        <input type="checkbox" aria-label={`accept ${props.minimumAge}`} checked={props.checked} onChange={props.onChangeAction} />
    ),
}));

function fill(name = 'Maria', message = 'Hi') {
    fireEvent.change(screen.getByLabelText(/guestCode.wish.nameLabel/), { target: { value: name } });
    fireEvent.change(screen.getByLabelText(/guestCode.wish.messageLabel/), { target: { value: message } });
}

function tickBox() {
    fireEvent.click(screen.getByRole('checkbox', { name: 'accept 16' }));
}

function submit(container: HTMLElement) {
    fireEvent.submit(container.querySelector('form')!);
}

describe('GuestWishForm', () => {
    beforeEach(() => {
        mutateAsync.mockReset();
    });
    afterEach(cleanup);

    it('keeps send off until name, message and the box are filled', () => {
        render(<GuestWishForm token="t" />);
        const send = screen.getByRole('button', { name: /guestCode.wish.submit/ });
        expect(send).toBeDisabled();
        fill();
        expect(send).toBeDisabled();
        fireEvent.click(screen.getByRole('checkbox', { name: 'accept 16' }));
        expect(send).toBeEnabled();
    });

    it('sends the trimmed name and message with the acceptance versions', async () => {
        mutateAsync.mockResolvedValue({ id: 'w1', createdAt: '' });
        const { container } = render(<GuestWishForm token="t" />);
        fill('  Maria ', ' Hi  ');
        tickBox();
        submit(container);

        await screen.findByText('guestCode.wish.sent');
        expect(mutateAsync).toHaveBeenCalledWith({
            token: 't',
            guestName: 'Maria',
            message: 'Hi',
            acceptance: { termsVersion: '2026-10-04', guidelinesVersion: '2026-09-30' },
        });
    });

    it('shows the sent state, and Write another brings back an empty message with the name kept', async () => {
        mutateAsync.mockResolvedValue({ id: 'w1', createdAt: '' });
        const { container } = render(<GuestWishForm token="t" />);
        fill();
        tickBox();
        submit(container);

        await screen.findByText('guestCode.wish.sent');
        fireEvent.click(screen.getByRole('button', { name: 'guestCode.wish.writeAnother' }));

        expect(screen.getByLabelText(/guestCode.wish.nameLabel/)).toHaveValue('Maria');
        expect(screen.getByLabelText(/guestCode.wish.messageLabel/)).toHaveValue('');
        expect(screen.getByRole('checkbox', { name: 'accept 16' })).toBeChecked();
    });

    it('keeps the text and says so when the code no longer takes wishes', async () => {
        mutateAsync.mockRejectedValue(new ApiError(409, { errorCode: 2005 }));
        const { container } = render(<GuestWishForm token="t" />);
        fill();
        tickBox();
        submit(container);

        expect(await screen.findByRole('alert')).toHaveTextContent('guestCode.wish.notAvailable');
        expect(screen.getByLabelText(/guestCode.wish.messageLabel/)).toHaveValue('Hi');
    });

    it('says so when too many wishes were sent', async () => {
        mutateAsync.mockRejectedValue(new ApiError(429, {}));
        const { container } = render(<GuestWishForm token="t" />);
        fill();
        tickBox();
        submit(container);

        expect(await screen.findByRole('alert')).toHaveTextContent('guestCode.wish.rateLimited');
    });

    it('asks to tick again when the terms changed', async () => {
        mutateAsync.mockRejectedValue(new ApiError(400, { errorCode: 3043 }));
        const { container } = render(<GuestWishForm token="t" />);
        fill();
        tickBox();
        submit(container);

        expect(await screen.findByRole('alert')).toHaveTextContent('anonymousUpload.acceptanceChanged');
        expect(screen.getByRole('checkbox', { name: 'accept 16' })).not.toBeChecked();
    });

    it('shows a field error under the message', async () => {
        mutateAsync.mockRejectedValue(new ApiError(400, { errorCode: 3001, errors: { message: 'too long' } }));
        const { container } = render(<GuestWishForm token="t" />);
        fill();
        tickBox();
        submit(container);

        await waitFor(() => expect(screen.getByText('too long')).toBeInTheDocument());
    });
});
