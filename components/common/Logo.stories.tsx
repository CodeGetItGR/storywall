import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Logo } from '@/components/common/Logo';

const meta = {
    title: 'Common/Logo',
    component: Logo,
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Row: Story = {};

export const Column: Story = {
    args: { direction: 'col' },
};

export const GradientWordmark: Story = {
    args: { wordmarkVariant: 'gradient' },
};
