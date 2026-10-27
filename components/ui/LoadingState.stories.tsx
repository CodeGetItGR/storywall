import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LoadingState } from '@/components/ui/LoadingState';

const meta = {
    title: 'UI/LoadingState',
    component: LoadingState,
} satisfies Meta<typeof LoadingState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
    args: { label: 'Loading posts…' },
};

export const Medium: Story = {
    args: { size: 'md', label: 'Loading posts…' },
};
