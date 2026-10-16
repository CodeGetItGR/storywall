import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Avatar from '@/components/ui/avatar';

const meta = {
    title: 'UI/Avatar',
    component: Avatar,
    args: { initials: 'MK', size: 'md' },
    argTypes: {
        size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {};

export const Image: Story = {
    args: { src: '/images/couple-hero.png', alt: 'Maria and Kostas', size: 'xl' },
};

// An image that fails to load falls back to the initials.
export const BrokenImage: Story = {
    args: { src: '/images/missing.png', size: 'xl' },
};

export const CustomColor: Story = {
    args: { color: '#4f7cac' },
};

export const Sizes: Story = {
    render: (args) => (
        <div className="flex items-end gap-3">
            <Avatar {...args} size="xs" />
            <Avatar {...args} size="sm" />
            <Avatar {...args} size="md" />
            <Avatar {...args} size="lg" />
            <Avatar {...args} size="xl" />
            <Avatar {...args} size="2xl" />
        </div>
    ),
};
