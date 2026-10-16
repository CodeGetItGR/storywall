import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { WishbookSummarySection } from '@/components/layout/right-context-panel/WishbookSummarySection';

const entries = [
    {
        id: 'wish-1',
        eventId: 'evt-story',
        authorMemberId: 'mem-nikos',
        guestName: 'Nikos Alexiou',
        message: 'Wishing you a lifetime of love, laughter and long summer evenings together. We cannot wait to celebrate with you both.',
        createdAt: '2026-06-14T18:00:00Z',
        canDelete: false,
        highlighted: false,
    },
    {
        id: 'wish-2',
        eventId: 'evt-story',
        authorMemberId: null,
        guestName: 'Aunt Sofia',
        message: 'Να ζήσετε!',
        createdAt: '2026-06-13T10:00:00Z',
        canDelete: false,
        highlighted: true,
    },
];

const meta = {
    title: 'Layout/RightContextPanel/WishbookSummarySection',
    component: WishbookSummarySection,
    args: { eventId: 'evt-story', title: 'Wishbook', entries, total: 12 },
    decorators: [
        (Story) => (
            <div className="max-w-xs">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof WishbookSummarySection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
    args: { entries: [], total: 0 },
};
