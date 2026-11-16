import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { MyWishesSection } from '@/components/wishbook/MyWishesSection';

const entries = [
    {
        id: 'wish-1',
        eventId: 'evt-story',
        authorMemberId: 'mem-me',
        guestName: 'Nikos Alexiou',
        message: 'Wishing you a lifetime of love, laughter and long summer evenings together. We cannot wait to celebrate with you both.',
        createdAt: '2026-06-14T18:00:00Z',
        canDelete: true,
        highlighted: null,
    },
    {
        id: 'wish-2',
        eventId: 'evt-story',
        authorMemberId: 'mem-me',
        guestName: 'Nikos Alexiou',
        message: 'Να ζήσετε!',
        createdAt: '2026-06-13T10:00:00Z',
        canDelete: true,
        highlighted: null,
    },
];

const meta = {
    title: 'Wishbook/MyWishesSection',
    component: MyWishesSection,
    args: { entries, isLoading: false, hasNextPage: false, isFetchingNextPage: false, onLoadMore: fn(), canEdit: true, onSelect: fn() },
    decorators: [
        (Story) => (
            <div className="max-w-md p-4">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof MyWishesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Editable: Story = {};
export const ReadOnly: Story = { args: { canEdit: false } };
export const WithMore: Story = { args: { hasNextPage: true } };
export const Loading: Story = { args: { isLoading: true, entries: [] } };
