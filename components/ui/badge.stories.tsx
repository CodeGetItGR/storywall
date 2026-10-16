import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Check } from 'lucide-react';

import Badge from '@/components/ui/badge';

const meta = {
    title: 'UI/Badge',
    component: Badge,
    args: { children: 'Draft' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
    render: () => (
        <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Live</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="destructive">Failed</Badge>
            <Badge variant="outline">Outline</Badge>
        </div>
    ),
};

export const WithIcon: Story = {
    args: {
        variant: 'success',
        children: (
            <>
                <Check className="h-3 w-3" aria-hidden="true" />
                Paid
            </>
        ),
    },
};
