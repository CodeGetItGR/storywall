import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { GuestInquiriesSection } from '@/components/business/GuestInquiriesSection';
import type { GuestInquiryDto } from '@/lib/api/types';

const ROWS: GuestInquiryDto[] = [
    {
        id: 'q1',
        guestName: 'Maria Papadopoulou',
        eventTitle: 'Anna & Nikos',
        eventDate: '2027-06-12',
        phone: '+30 690 000 0000',
        email: 'maria@example.com',
        note: 'Summer wedding',
        status: 'NEW',
        createdAt: '2026-06-15T10:00:00Z',
    },
    {
        id: 'q2',
        guestName: 'Nikos Konstantinou',
        eventTitle: 'Eleni turns 40',
        eventDate: '2027-09-04',
        phone: null,
        email: 'nikos@example.com',
        note: null,
        status: 'NEW',
        createdAt: '2026-06-14T10:00:00Z',
    },
    {
        id: 'q3',
        guestName: 'Sofia Georgiou',
        eventTitle: 'Anna & Nikos',
        eventDate: '2027-05-22',
        phone: '+30 691 111 1111',
        email: null,
        note: null,
        status: 'DONE',
        createdAt: '2026-06-10T10:00:00Z',
    },
];

const meta = {
    title: 'Business/GuestInquiriesSection',
    component: GuestInquiriesSection,
    args: {
        partner: true,
        inquiries: ROWS,
        isLoading: false,
        loadFailed: false,
        hasMore: false,
        isLoadingMore: false,
        onOpenAction: fn(),
        onLoadMoreAction: fn(),
        onRetryAction: fn(),
    },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-xl p-4">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof GuestInquiriesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const List: Story = {};

export const WithMore: Story = {
    args: { hasMore: true },
};

export const Empty: Story = {
    args: { inquiries: [] },
};

export const LoadFailed: Story = {
    args: { inquiries: [], loadFailed: true },
};

// Not a partner: a blurred sample with nothing to tap.
export const Locked: Story = {
    args: { partner: false, inquiries: [] },
};

export const Loading: Story = {
    args: { inquiries: [], isLoading: true },
};
