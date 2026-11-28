import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import type { RsvpSender } from '@/lib/invitation/rsvp';
import type { InvitationRsvpState } from '@/lib/invitation/rsvpSessions';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import en from '@/messages/en.json';

// next/font only works when Next compiles the file.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

afterEach(cleanup);

// The sample invitation is in Greek.
const labels = INVITATION_LABELS.el;
const { rsvp: section } = SAMPLE_SECTIONS;

const noMedia = () => undefined;

const SESSIONS: InvitationRsvpState = {
    closed: false,
    sessions: [
        { id: '0b0c1f9e-3c1a-4d55-9d1e-6a2c4b9f7a10', title: 'Τελετή', when: '18:00' },
        { id: '7d2e9a41-5b6c-4f8d-a1e2-3c4b5d6e7f80', title: 'Δεξίωση', when: '21:00' },
    ],
};

function draw(rsvp?: InvitationRsvpState, sendRsvp?: RsvpSender) {
    render(
        <NextIntlClientProvider locale="el" messages={en} timeZone="Europe/Athens">
            <InvitationRenderer document={{ ...SAMPLE_DOCUMENT, sections: [section] }} theme={SAMPLE_THEME} media={noMedia} rsvp={rsvp} sendRsvp={sendRsvp} />
        </NextIntlClientProvider>,
    );
}

const dialog = () => document.querySelector('dialog') as HTMLDialogElement;
const inDialog = () => within(dialog());

function fillIn() {
    fireEvent.change(inDialog().getByLabelText(labels.rsvpName), { target: { value: 'Μαρία' } });
    fireEvent.change(inDialog().getByLabelText(labels.rsvpPhone), { target: { value: '6900000000' } });
}

const submit = () => fireEvent.click(inDialog().getByRole('button', { name: labels.rsvpSubmit }));

describe('The RSVP block', () => {
    it('shows its title, deadline and two answers, with the form shut', () => {
        draw();
        expect(screen.getByText(section.data.title)).toBeInTheDocument();
        expect(screen.getByText(section.data.deadline)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: labels.rsvpYes })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: labels.rsvpNo })).toBeInTheDocument();
        expect(dialog().open).toBe(false);
        expect(inDialog().queryByLabelText(labels.rsvpName)).toBeNull();
    });

    it('opens the form with the answer the guest tapped', () => {
        draw();
        fireEvent.click(screen.getByRole('button', { name: labels.rsvpNo }));
        expect(dialog().open).toBe(true);
        expect(inDialog().getByText(section.data.title)).toBeInTheDocument();
        expect(inDialog().getByLabelText<HTMLInputElement>(labels.rsvpNo).checked).toBe(true);
    });

    it('closes the pop-up and opens it again empty', () => {
        draw();
        fireEvent.click(screen.getByRole('button', { name: labels.rsvpYes }));
        fireEvent.change(inDialog().getByLabelText(labels.rsvpName), { target: { value: 'Μαρία' } });
        fireEvent.click(inDialog().getByRole('button', { name: labels.close }));
        expect(dialog().open).toBe(false);

        fireEvent.click(screen.getByRole('button', { name: labels.rsvpYes }));
        expect(inDialog().getByLabelText<HTMLInputElement>(labels.rsvpName).value).toBe('');
    });

    it('thanks the guest in place of the answers once the reply is saved', async () => {
        const send = vi.fn<RsvpSender>().mockResolvedValue({ ok: true });
        draw(undefined, send);
        fireEvent.click(screen.getByRole('button', { name: labels.rsvpYes }));
        fillIn();
        submit();

        await inDialog().findByText(labels.rsvpThanks);
        fireEvent.click(inDialog().getByRole('button', { name: labels.close }));
        expect(screen.getByText(labels.rsvpThanks)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: labels.rsvpYes })).toBeNull();
    });
});

describe('After the reply-by date', () => {
    it('says replies are closed, with no answers to tap', () => {
        draw({ closed: true, sessions: SESSIONS.sessions });
        expect(screen.getByText(labels.rsvpClosed)).toBeInTheDocument();
        expect(screen.getByText(section.data.deadline)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: labels.rsvpYes })).toBeNull();
        expect(document.querySelector('dialog')).toBeNull();
    });
});

describe('Sessions that ask for an answer', () => {
    const [ceremony, reception] = SESSIONS.sessions;
    const row = (title: string) => within(inDialog().getByRole('radiogroup', { name: new RegExp(title) }));

    it('asks about each one while the guest is attending', () => {
        draw(SESSIONS);
        fireEvent.click(screen.getByRole('button', { name: labels.rsvpYes }));
        expect(inDialog().getByText(labels.rsvpSessionsTitle)).toBeVisible();
        expect(row(ceremony.title).getByText('18:00')).toBeInTheDocument();

        fireEvent.click(inDialog().getByLabelText(labels.rsvpNo));
        expect(inDialog().getByText(labels.rsvpSessionsTitle)).not.toBeVisible();
    });

    it('needs every answer, then sends them with the reply', async () => {
        const send = vi.fn<RsvpSender>().mockResolvedValue({ ok: true });
        draw(SESSIONS, send);
        fireEvent.click(screen.getByRole('button', { name: labels.rsvpYes }));
        fillIn();
        fireEvent.click(row(ceremony.title).getByLabelText(labels.rsvpSessionYes));
        submit();

        expect(await inDialog().findByRole('status')).toHaveTextContent(labels.rsvpSessionsRequired);
        expect(send).not.toHaveBeenCalled();

        fireEvent.click(row(reception.title).getByLabelText(labels.rsvpSessionNo));
        submit();
        await inDialog().findByText(labels.rsvpThanks);
        expect(send).toHaveBeenCalledWith(
            expect.objectContaining({
                attendanceStatus: 'ATTENDING',
                sessionAnswers: [
                    { sessionId: ceremony.id, attending: true },
                    { sessionId: reception.id, attending: false },
                ],
            }),
        );
    });

    it('sends none for a guest who declines', async () => {
        const send = vi.fn<RsvpSender>().mockResolvedValue({ ok: true });
        draw(SESSIONS, send);
        fireEvent.click(screen.getByRole('button', { name: labels.rsvpNo }));
        fillIn();
        submit();

        await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
        expect(send.mock.calls[0][0]).not.toHaveProperty('sessionAnswers');
    });
});
