import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Globals } from 'storybook/internal/types';
import { expect, fn, userEvent, within } from 'storybook/test';

import { labelsFor, LONG_TEXT, LONG_TITLE, onDark, SectionStory, storySection } from '@/.storybook/invitation';

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

export const Sending: Story = {
    args: { sendRsvp: fn(() => new Promise<void>(() => {})) },
    play: async ({ canvasElement, globals }) => {
        const labels = labelsFor(globals);
        await fillIn(canvasElement, globals);
        await submit(canvasElement, globals);
        await within(canvasElement).findByText(labels.rsvpSending);
        await expect(within(canvasElement).getByRole('button', { name: labels.rsvpSubmit })).toBeDisabled();
    },
};

export const Success: Story = {
    args: { sendRsvp: fn(async () => {}) },
    play: async ({ args, canvasElement, globals }) => {
        await fillIn(canvasElement, globals);
        await submit(canvasElement, globals);
        await within(canvasElement).findByText(labelsFor(globals).rsvpThanks);
        await expect(args.sendRsvp).toHaveBeenCalledWith({
            guestName: GUEST.name,
            phone: GUEST.phone,
            email: '',
            attending: true,
            adultsCount: 2,
            childrenCount: 1,
            note: '',
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
