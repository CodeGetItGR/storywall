import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Globals } from 'storybook/internal/types';
import { expect, fn, userEvent, within } from 'storybook/test';

import { labelsFor, LONG_TEXT, LONG_TITLE, onDark, SectionStory, storySection } from '@/.storybook/invitation';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import type { RsvpOutcome } from '@/lib/invitation/rsvp';

const section = storySection('rsvp');
const GUEST = { name: 'Μαρία', phone: '6900000000' };

async function fillIn(canvasElement: HTMLElement, globals: Globals) {
    const canvas = within(canvasElement);
    const labels = labelsFor(globals);
    await userEvent.type(canvas.getByLabelText(labels.rsvpName), GUEST.name);
    await userEvent.type(canvas.getByLabelText(labels.rsvpPhone), GUEST.phone);
}

async function submit(canvasElement: HTMLElement, globals: Globals) {
    await userEvent.click(within(canvasElement).getByRole('button', { name: labelsFor(globals).rsvpSubmit }));
}

const meta = {
    title: 'SaveMyDate/Info/RsvpSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// The event's plan has the wall: guests can join the event from here, before and after they reply.
export const WithJoinButton: Story = {
    args: { joinUrl: 'https://storywall.gr/q/story-token', sendRsvp: fn(async (): Promise<RsvpOutcome> => ({ ok: true })) },
    play: async ({ canvasElement, globals }) => {
        const labels = labelsFor(globals);
        await expect(within(canvasElement).getByRole('link', { name: labels.joinEvent })).toHaveAttribute('href', 'https://storywall.gr/q/story-token');
        await fillIn(canvasElement, globals);
        await submit(canvasElement, globals);
        await within(canvasElement).findByText(labels.rsvpThanks);
        await expect(within(canvasElement).getByRole('link', { name: labels.joinEvent })).toBeVisible();
    },
};

export const Sending: Story = {
    args: { sendRsvp: fn(() => new Promise<RsvpOutcome>(() => {})) },
    play: async ({ canvasElement, globals }) => {
        const labels = labelsFor(globals);
        await fillIn(canvasElement, globals);
        await submit(canvasElement, globals);
        await within(canvasElement).findByText(labels.rsvpSending);
        await expect(within(canvasElement).getByRole('button', { name: labels.rsvpSubmit })).toBeDisabled();
    },
};

export const Success: Story = {
    args: { sendRsvp: fn(async (): Promise<RsvpOutcome> => ({ ok: true })) },
    play: async ({ args, canvasElement, globals }) => {
        await fillIn(canvasElement, globals);
        await submit(canvasElement, globals);
        await within(canvasElement).findByText(labelsFor(globals).rsvpThanks);
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
        await fillIn(canvasElement, globals);
        await submit(canvasElement, globals);
        await within(canvasElement).findByText(labelsFor(globals).rsvpError);
    },
};

// The backend refused the reply (here: RSVP is off); the guest keeps the form.
// The message comes from the server in the invitation's language: Greek here.
export const Refused: Story = {
    globals: { locale: 'el' },
    args: { sendRsvp: fn(async (): Promise<RsvpOutcome> => ({ ok: false, message: INVITATION_LABELS.el.rsvpClosed })) },
    play: async ({ args, canvasElement, globals }) => {
        await fillIn(canvasElement, globals);
        await submit(canvasElement, globals);
        await within(canvasElement).findByText(INVITATION_LABELS.el.rsvpClosed);
        await expect(args.sendRsvp).toHaveBeenCalledTimes(1);
        await expect(within(canvasElement).getByRole('button', { name: labelsFor(globals).rsvpSubmit })).toBeEnabled();
    },
};

// The event holds its cap of invitation replies (409 5223): the backend's own
// message, in the invitation's language, shown as it arrives.
const REPLIES_FULL_EL = 'Αυτή η εκδήλωση δεν μπορεί να δεχτεί άλλες απαντήσεις μέσω της πρόσκλησης. Παρακαλούμε επικοινωνήστε με τους διοργανωτές.';

export const RepliesFull: Story = {
    globals: { locale: 'el' },
    args: { sendRsvp: fn(async (): Promise<RsvpOutcome> => ({ ok: false, message: REPLIES_FULL_EL })) },
    play: async ({ args, canvasElement, globals }) => {
        await fillIn(canvasElement, globals);
        await submit(canvasElement, globals);
        await within(canvasElement).findByText(REPLIES_FULL_EL);
        await expect(args.sendRsvp).toHaveBeenCalledTimes(1);
    },
};

export const PhoneInvalid: Story = {
    args: { sendRsvp: fn(async (): Promise<RsvpOutcome> => ({ ok: true })) },
    play: async ({ args, canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const labels = labelsFor(globals);
        await userEvent.type(canvas.getByLabelText(labels.rsvpName), GUEST.name);
        await userEvent.type(canvas.getByLabelText(labels.rsvpPhone), '12 34');
        await submit(canvasElement, globals);
        await canvas.findByText(labels.rsvpPhoneInvalid);
        await expect(args.sendRsvp).not.toHaveBeenCalled();
    },
};

export const Declining: Story = {
    play: async ({ canvasElement, globals }) => {
        const counts = canvasElement.querySelector('.rsvp-counts');
        await userEvent.click(within(canvasElement).getByLabelText(labelsFor(globals).rsvpNo));
        await expect(counts).not.toBeVisible();
    },
};

export const LongContent: Story = {
    args: { section: storySection('rsvp', { title: LONG_TITLE, deadline: LONG_TEXT }) },
};

export const WithoutHeader: Story = {
    args: { section: storySection('rsvp', { title: '', deadline: '' }) },
};

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
    },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section) },
};
