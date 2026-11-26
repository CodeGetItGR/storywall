import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Globals } from 'storybook/internal/types';
import { expect, fn, userEvent, within } from 'storybook/test';

import { labelsFor, LONG_TEXT, LONG_TITLE, onDark, SectionStory, storySection } from '@/.storybook/invitation';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import type { RsvpOutcome } from '@/lib/invitation/rsvp';
import type { InvitationRsvpState } from '@/lib/invitation/rsvpSessions';

const section = storySection('rsvp');
const GUEST = { name: 'Μαρία', phone: '6900000000' };

// An event whose schedule asks for an answer per session (KAN-298).
const WITH_SESSIONS: InvitationRsvpState = {
    closed: false,
    sessions: [
        { id: '0b0c1f9e-3c1a-4d55-9d1e-6a2c4b9f7a10', title: 'Τελετή', when: '18:00' },
        { id: '7d2e9a41-5b6c-4f8d-a1e2-3c4b5d6e7f80', title: 'Δεξίωση', when: '21:00' },
    ],
};

// Taps one of the block's answers and waits for the form's pop-up.
async function open(canvasElement: HTMLElement, globals: Globals, answer: 'yes' | 'no' = 'yes') {
    const labels = labelsFor(globals);
    await userEvent.click(within(canvasElement).getByRole('button', { name: answer === 'yes' ? labels.rsvpYes : labels.rsvpNo }));
    return within(await waitForOpen('dialog'));
}

async function fillIn(canvasElement: HTMLElement, globals: Globals) {
    const dialog = await open(canvasElement, globals);
    const labels = labelsFor(globals);
    await userEvent.type(dialog.getByLabelText(labels.rsvpName), GUEST.name);
    await userEvent.type(dialog.getByLabelText(labels.rsvpPhone), GUEST.phone);
    return dialog;
}

async function submit(dialog: ReturnType<typeof within>, globals: Globals) {
    await userEvent.click(dialog.getByRole('button', { name: labelsFor(globals).rsvpSubmit }));
}

const meta = {
    title: 'SaveMyDate/Info/RsvpSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

// The compact block: title, deadline and the two answers.
export const Default: Story = {};

// The reply-by date has passed (KAN-297): no answers, only that replies are closed.
export const Closed: Story = {
    args: { rsvp: { closed: true, sessions: [] } },
    play: async ({ canvasElement, globals }) => {
        const labels = labelsFor(globals);
        await expect(within(canvasElement).getByText(labels.rsvpClosed)).toBeVisible();
        await expect(within(canvasElement).queryByRole('button', { name: labels.rsvpYes })).toBeNull();
    },
};

export const ClosedOnDark: Story = {
    args: { section: onDark(section), rsvp: { closed: true, sessions: [] } },
};

// Yes opens the form with yes picked.
export const FormOpen: Story = {
    play: async ({ canvasElement, globals }) => {
        const dialog = await open(canvasElement, globals);
        await expect(dialog.getByLabelText<HTMLInputElement>(labelsFor(globals).rsvpYes).checked).toBe(true);
    },
};

// No opens it with no picked, and the headcount hidden.
export const Declining: Story = {
    play: async ({ canvasElement, globals }) => {
        const dialog = await open(canvasElement, globals, 'no');
        await expect(dialog.getByLabelText<HTMLInputElement>(labelsFor(globals).rsvpNo).checked).toBe(true);
        await expect(canvasElement.querySelector('.rsvp-counts')).not.toBeVisible();
    },
};

export const ClosingThePopUp: Story = {
    tags: ['visual-skip'],
    play: async ({ canvasElement, globals }) => {
        const labels = labelsFor(globals);
        const dialog = await open(canvasElement, globals);
        await userEvent.click(dialog.getByRole('button', { name: labels.close }));
        await expect(canvasElement.querySelector('dialog')).not.toHaveAttribute('open');
        await expect(within(canvasElement).getByRole('button', { name: labels.rsvpYes })).toBeVisible();
    },
};

// The schedule's sessions with RSVP turned on, each with a yes or no.
export const WithSessions: Story = {
    args: { rsvp: WITH_SESSIONS },
    play: async ({ canvasElement, globals }) => {
        const dialog = await open(canvasElement, globals);
        await expect(dialog.getByText(labelsFor(globals).rsvpSessionsTitle)).toBeVisible();
    },
};

export const SessionsMissing: Story = {
    args: { rsvp: WITH_SESSIONS, sendRsvp: fn(async (): Promise<RsvpOutcome> => ({ ok: true })) },
    play: async ({ args, canvasElement, globals }) => {
        const dialog = await fillIn(canvasElement, globals);
        await submit(dialog, globals);
        await expect(dialog.getByRole('status')).toHaveTextContent(labelsFor(globals).rsvpSessionsRequired);
        await expect(args.sendRsvp).not.toHaveBeenCalled();
    },
};

export const SessionsAnswered: Story = {
    tags: ['visual-skip'],
    args: { rsvp: WITH_SESSIONS, sendRsvp: fn(async (): Promise<RsvpOutcome> => ({ ok: true })) },
    play: async ({ args, canvasElement, globals }) => {
        const labels = labelsFor(globals);
        const dialog = await fillIn(canvasElement, globals);
        const [ceremony, reception] = dialog.getAllByRole('radiogroup').slice(1);
        await userEvent.click(within(ceremony).getByLabelText(labels.rsvpSessionYes));
        await userEvent.click(within(reception).getByLabelText(labels.rsvpSessionNo));
        await submit(dialog, globals);
        await dialog.findByText(labels.rsvpThanks);
        await expect(args.sendRsvp).toHaveBeenCalledWith(
            expect.objectContaining({
                sessionAnswers: [
                    { sessionId: WITH_SESSIONS.sessions[0].id, attending: true },
                    { sessionId: WITH_SESSIONS.sessions[1].id, attending: false },
                ],
            }),
        );
    },
};

// The event's plan has the wall: guests can join the event from here, before and after they reply.
export const WithJoinButton: Story = {
    args: { joinUrl: 'https://storywall.gr/q/story-token', sendRsvp: fn(async (): Promise<RsvpOutcome> => ({ ok: true })) },
    play: async ({ canvasElement, globals }) => {
        const labels = labelsFor(globals);
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('link', { name: labels.joinEvent })).toHaveAttribute('href', 'https://storywall.gr/q/story-token');
        const dialog = await fillIn(canvasElement, globals);
        await submit(dialog, globals);
        await dialog.findByText(labels.rsvpThanks);
        await userEvent.click(dialog.getByRole('button', { name: labels.close }));
        await expect(canvas.getByText(labels.rsvpThanks)).toBeVisible();
        await expect(canvas.getByRole('link', { name: labels.joinEvent })).toBeVisible();
    },
};

export const Sending: Story = {
    args: { sendRsvp: fn(() => new Promise<RsvpOutcome>(() => {})) },
    play: async ({ canvasElement, globals }) => {
        const labels = labelsFor(globals);
        const dialog = await fillIn(canvasElement, globals);
        await submit(dialog, globals);
        await dialog.findByText(labels.rsvpSending);
        await expect(dialog.getByRole('button', { name: labels.rsvpSubmit })).toBeDisabled();
    },
};

export const Success: Story = {
    args: { sendRsvp: fn(async (): Promise<RsvpOutcome> => ({ ok: true })) },
    play: async ({ args, canvasElement, globals }) => {
        const dialog = await fillIn(canvasElement, globals);
        await submit(dialog, globals);
        await dialog.findByText(labelsFor(globals).rsvpThanks);
        await expect(args.sendRsvp).toHaveBeenCalledWith({
            guestName: GUEST.name,
            attendanceStatus: 'ATTENDING',
            phone: GUEST.phone,
            email: '',
            adultCount: 2,
            childCount: 1,
            notes: '',
            website: '',
        });
    },
};

export const Failed: Story = {
    args: {
        sendRsvp: fn(async () => {
            throw new Error('down');
        }),
    },
    play: async ({ canvasElement, globals }) => {
        const dialog = await fillIn(canvasElement, globals);
        await submit(dialog, globals);
        await dialog.findByText(labelsFor(globals).rsvpError);
    },
};

// The backend refused the reply (here: RSVP is off); the guest keeps the form.
// The message comes from the server in the invitation's language: Greek here.
export const Refused: Story = {
    globals: { locale: 'el' },
    args: { sendRsvp: fn(async (): Promise<RsvpOutcome> => ({ ok: false, message: INVITATION_LABELS.el.rsvpClosed })) },
    play: async ({ args, canvasElement, globals }) => {
        const dialog = await fillIn(canvasElement, globals);
        await submit(dialog, globals);
        await dialog.findByText(INVITATION_LABELS.el.rsvpClosed);
        await expect(args.sendRsvp).toHaveBeenCalledTimes(1);
        await expect(dialog.getByRole('button', { name: labelsFor(globals).rsvpSubmit })).toBeEnabled();
    },
};

// The event holds its cap of invitation replies (409 5223): the backend's own
// message, in the invitation's language, shown as it arrives.
const REPLIES_FULL_EL = 'Αυτή η εκδήλωση δεν μπορεί να δεχτεί άλλες απαντήσεις μέσω της πρόσκλησης. Παρακαλούμε επικοινωνήστε με τους διοργανωτές.';

export const RepliesFull: Story = {
    globals: { locale: 'el' },
    args: { sendRsvp: fn(async (): Promise<RsvpOutcome> => ({ ok: false, message: REPLIES_FULL_EL })) },
    play: async ({ args, canvasElement, globals }) => {
        const dialog = await fillIn(canvasElement, globals);
        await submit(dialog, globals);
        await dialog.findByText(REPLIES_FULL_EL);
        await expect(args.sendRsvp).toHaveBeenCalledTimes(1);
    },
};

export const PhoneInvalid: Story = {
    args: { sendRsvp: fn(async (): Promise<RsvpOutcome> => ({ ok: true })) },
    play: async ({ args, canvasElement, globals }) => {
        const labels = labelsFor(globals);
        const dialog = await open(canvasElement, globals);
        await userEvent.type(dialog.getByLabelText(labels.rsvpName), GUEST.name);
        await userEvent.type(dialog.getByLabelText(labels.rsvpPhone), '12 34');
        await submit(dialog, globals);
        await dialog.findByText(labels.rsvpPhoneInvalid);
        await expect(args.sendRsvp).not.toHaveBeenCalled();
    },
};

export const LongContent: Story = {
    args: { section: storySection('rsvp', { title: LONG_TITLE, deadline: LONG_TEXT }) },
};

// A long title wraps in the pop-up's header, beside its close button.
export const LongTitleOpen: Story = {
    args: { section: storySection('rsvp', { title: LONG_TITLE, deadline: LONG_TEXT }) },
    play: async ({ canvasElement, globals }) => {
        await open(canvasElement, globals);
    },
};

export const WithoutHeader: Story = {
    args: { section: storySection('rsvp', { title: '', deadline: '' }) },
};

// The host's form style, on the block's buttons and inside the pop-up.
export const CustomFormStyle: Story = {
    args: {
        section: storySection('rsvp', {
            formStyle: {
                labelColor: '#8a6d3b',
                fieldBorderColor: '#8a6d3b',
                fieldBorderWidth: 2,
                fieldFillColor: '#ffffff',
                fieldRadius: 0,
                optionSelectedColor: '#8a6d3b',
                buttonBg: '#2f2b2d',
                buttonColor: '#ffffff',
            },
        }),
        rsvp: WITH_SESSIONS,
    },
    play: async ({ canvasElement, globals }) => {
        await open(canvasElement, globals);
    },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section) },
};

// Light labels the host picked for a dark page read as ink in the white pop-up.
export const OnDarkBackgroundOpen: Story = {
    args: { section: onDark(storySection('rsvp', { formStyle: { labelColor: '#ffffff' } })) },
    play: async ({ canvasElement, globals }) => {
        const dialog = await open(canvasElement, globals);
        const label = dialog.getByText(labelsFor(globals).rsvpName);
        await expect(getComputedStyle(label).color).toBe('rgb(36, 31, 26)');
    },
};
