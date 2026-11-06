import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

const meta = {
    title: 'UI/Skeleton',
    component: Skeleton,
    args: { className: 'h-4 w-48' },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// A typical row placeholder, announced once through SkeletonStatus.
export const Row: Story = {
    render: () => (
        <SkeletonStatus className="flex max-w-sm items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
            </div>
        </SkeletonStatus>
    ),
};
