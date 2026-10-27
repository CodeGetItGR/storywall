import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Plus, Trash2 } from 'lucide-react';
import { fn } from 'storybook/test';

import { Button } from '@/components/ui/button';

const meta = {
    title: 'UI/Button',
    component: Button,
    args: { children: 'Save changes', onClick: fn() },
    argTypes: {
        variant: { control: 'select', options: ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] },
        size: { control: 'select', options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] },
    },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
    render: (args) => (
        <div className="flex flex-wrap items-center gap-3">
            <Button {...args} variant="default">
                Default
            </Button>
            <Button {...args} variant="outline">
                Outline
            </Button>
            <Button {...args} variant="secondary">
                Secondary
            </Button>
            <Button {...args} variant="ghost">
                Ghost
            </Button>
            <Button {...args} variant="destructive">
                Destructive
            </Button>
            <Button {...args} variant="link">
                Link
            </Button>
        </div>
    ),
};

export const Sizes: Story = {
    render: (args) => (
        <div className="flex flex-wrap items-center gap-3">
            <Button {...args} size="xs">
                Extra small
            </Button>
            <Button {...args} size="sm">
                Small
            </Button>
            <Button {...args} size="default">
                Default
            </Button>
            <Button {...args} size="lg">
                Large
            </Button>
        </div>
    ),
};

export const WithIcon: Story = {
    args: {
        children: (
            <>
                <Plus data-icon="inline-start" />
                Add post
            </>
        ),
    },
};

export const IconOnly: Story = {
    args: { size: 'icon', variant: 'destructive', 'aria-label': 'Delete', children: <Trash2 /> },
};

export const Disabled: Story = {
    args: { disabled: true },
};
