import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RsvpForm } from '@/components/saveMyDate/invitation/sections/info/RsvpForm';
import { rsvpPage } from '@/hooks/useInvitationRsvp';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import type { RsvpOutcome } from '@/lib/invitation/rsvp';

const saved: RsvpOutcome = { ok: true };

const labels = INVITATION_LABELS.en;

function fill() {
    fireEvent.change(screen.getByLabelText(labels.rsvpName), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByLabelText(labels.rsvpPhone), { target: { value: '6900000000' } });
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: labels.rsvpSubmit }));

const optionValues = (label: string) =>
    Array.from((screen.getByLabelText(label) as HTMLSelectElement).options).map((option) => Number(option.value));

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('RsvpForm', () => {
    it('offers the backend limits, with the old defaults', () => {
        render(<RsvpForm labels={labels} />);
        expect(optionValues(labels.rsvpAdults)).toEqual([1, 2, 3, 4, 5]);
        expect(optionValues(labels.rsvpChildren)).toEqual([0, 1, 2, 3, 4]);
        expect(screen.getByLabelText<HTMLSelectElement>(labels.rsvpAdults).value).toBe('2');
        expect(screen.getByLabelText<HTMLSelectElement>(labels.rsvpChildren).value).toBe('1');
    });

    it('sends the reply and thanks the guest', async () => {
        const send = vi.fn().mockResolvedValue(saved);
        render(<RsvpForm labels={labels} send={send} />);
        fill();
        submit();

        await screen.findByText(labels.rsvpThanks);
        expect(send).toHaveBeenCalledWith({
            guestName: 'Maria',
            attendanceStatus: 'ATTENDING',
            phone: '6900000000',
            email: '',
            adultCount: 2,
            childCount: 1,
            notes: '',
            website: '',
        });
        expect(screen.queryByRole('button', { name: labels.rsvpSubmit })).toBeNull();
    });

    it('shows that it is sending and blocks a second submit', async () => {
        let finish = () => {};
        const send = vi.fn(() => new Promise<RsvpOutcome>((resolve) => { finish = () => resolve(saved); }));
        render(<RsvpForm labels={labels} send={send} />);
        fill();
        submit();

        expect(await screen.findByText(labels.rsvpSending)).toBeTruthy();
        expect(screen.getByRole<HTMLButtonElement>('button', { name: labels.rsvpSubmit }).disabled).toBe(true);
        finish();
        await screen.findByText(labels.rsvpThanks);
    });

    it('keeps the form and lets the guest retry after an error', async () => {
        const send = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(saved);
        render(<RsvpForm labels={labels} send={send} />);
        fill();
        submit();

        await screen.findByText(labels.rsvpError);
        expect(screen.getByLabelText<HTMLInputElement>(labels.rsvpName).value).toBe('Maria');
        submit();
        await screen.findByText(labels.rsvpThanks);
    });

    it('hides the counts and sends none when declining', async () => {
        const send = vi.fn().mockResolvedValue(saved);
        const { container } = render(<RsvpForm labels={labels} send={send} />);
        fill();
        fireEvent.click(screen.getByLabelText(labels.rsvpNo));
        expect(container.querySelector<HTMLElement>('.rsvp-counts')?.style.display).toBe('none');

        submit();
        await waitFor(() => expect(send).toHaveBeenCalled());
        expect(send.mock.calls[0][0]).toMatchObject({ attendanceStatus: 'DECLINED', adultCount: 0, childCount: 0 });
    });

    it('shows the success state and saves nothing without a sender', async () => {
        render(<RsvpForm labels={labels} />);
        fill();
        submit();
        expect(await screen.findByText(labels.rsvpThanks)).toBeTruthy();
    });
    it('checks the phone before sending', async () => {
        const send = vi.fn();
        render(<RsvpForm labels={labels} send={send} />);
        fill();
        fireEvent.change(screen.getByLabelText(labels.rsvpPhone), { target: { value: '12 34' } });
        submit();

        expect(await screen.findByText(labels.rsvpPhoneInvalid)).toBeTruthy();
        expect(send).not.toHaveBeenCalled();
    });

    it("shows the sender's message and keeps the form", async () => {
        const send = vi.fn().mockResolvedValue({ ok: false, message: labels.rsvpClosed });
        render(<RsvpForm labels={labels} send={send} />);
        fill();
        submit();

        expect(await screen.findByText(labels.rsvpClosed)).toBeTruthy();
        expect(screen.getByRole('button', { name: labels.rsvpSubmit })).toBeTruthy();
    });

    it('reloads the page when the invitation is gone', async () => {
        const reload = vi.spyOn(rsvpPage, 'reload').mockImplementation(() => {});
        render(<RsvpForm labels={labels} send={vi.fn().mockResolvedValue({ ok: false, reload: true })} />);
        fill();
        submit();

        await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
        expect(screen.queryByText(labels.rsvpThanks)).toBeNull();
    });

    it('has a hidden honeypot that people and screen readers skip', () => {
        const { container } = render(<RsvpForm labels={labels} />);
        const honeypot = container.querySelector<HTMLInputElement>('input[name="website"]');
        expect(honeypot).not.toBeNull();
        expect(honeypot?.tabIndex).toBe(-1);
        expect(honeypot?.autocomplete).toBe('off');
        expect(honeypot?.closest('[aria-hidden="true"]')).not.toBeNull();
        expect(screen.queryByRole('textbox', { name: /website/i })).toBeNull();
    });
});
