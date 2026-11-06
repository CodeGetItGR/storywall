import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { BackButton } from '@/components/ui/BackButton';

const meta = {
    title: 'UI/BackButton',
    component: BackButton,
    args: { href: '/home', label: 'Back' },
} satisfies Meta<typeof BackButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Link: Story = {};

export const Icon: Story = {
    args: { variant: 'icon' },
};
