import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { AskDatesSheet } from '@/components/vendors/inquiries/AskDatesSheet';

// The clock in stories is fixed at 2026-06-15, so the date range starts there.
const meta = {
    title: 'Vendors/Inquiries/AskDatesSheet',
    component: AskDatesSheet,
    args: {
        name: 'Lens & Light',
        date: '',
        phone: '',
        email: 'maria@example.com',
        note: '',
        consent: false,
        dateBounds: { min: '2026-06-15', max: '2029-06-15' },
        dateError: null,
        contactError: null,
        sendError: null,
        sent: false,
        isSending: false,
        canSend: false,
        onDateChangeAction: fn(),
        onPhoneChangeAction: fn(),
        onEmailChangeAction: fn(),
        onNoteChangeAction: fn(),
        onConsentChangeAction: fn(),
        onSubmitAction: fn(),
        onCloseAction: fn(),
    },
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AskDatesSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Filled: Story = {
    args: { date: '2027-06-12', note: 'We are planning an evening ceremony in Nafplio.', consent: true, canSend: true },
};

// The messages come from the catalog in use, so they follow the toolbar's language.
export const Errors: Story = {
    args: { email: '' },
    render: (args, { globals }) => {
        const copy = copyFor(globals).Vendors.inquiry;
        return <AskDatesSheet {...args} dateError={copy.dateRequired} contactError={copy.contactRequired} />;
    },
};

export const SendError: Story = {
    args: { date: '2027-06-12', consent: true, canSend: true },
    render: (args, { globals }) => <AskDatesSheet {...args} sendError={copyFor(globals).ApiErrors.inquiryAlreadySent} />,
};

// The visual check runs with reduced motion, so the envelope is captured at rest.
export const Sent: Story = {
    args: { date: '2027-06-12', consent: true, sent: true },
};
