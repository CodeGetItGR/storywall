import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { InquirySheet } from '@/components/business/InquirySheet';
import type { GuestInquiryDto } from '@/lib/api/types';

const INQUIRY: GuestInquiryDto = {
    id: 'q1',
    guestName: 'Maria Papadopoulou',
    eventTitle: 'Anna & Nikos',
    eventDate: '2027-06-12',
    phone: '+30 690 000 0000',
    email: 'maria.papadopoulou@example.com',
    note: 'We are planning an evening ceremony in Nafplio.\nAbout 120 guests.',
    status: 'NEW',
    createdAt: '2026-06-15T10:00:00Z',
};

const meta = {
    title: 'Business/InquirySheet',
    component: InquirySheet,
    args: {
        inquiry: INQUIRY,
        isSaving: false,
        error: null,
        onSetDoneAction: fn(),
        onCloseAction: fn(),
    },
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof InquirySheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const New: Story = {};

export const Done: Story = {
    args: { inquiry: { ...INQUIRY, status: 'DONE' } },
};

export const EmailOnly: Story = {
    args: { inquiry: { ...INQUIRY, phone: null, note: null } },
};

// The message comes from the catalog in use, so it follows the toolbar's language.
export const SaveError: Story = {
    render: (args, { globals }) => <InquirySheet {...args} error={copyFor(globals).ApiErrors.generic} />,
};
