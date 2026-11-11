import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ArrowDown } from 'lucide-react';
import { fn } from 'storybook/test';

import { MoveArrowButton } from '@/components/saveMyDate/editor/handles/MoveArrowButton';

const meta = {
    title: 'SaveMyDate/Editor/Handles/MoveArrowButton',
    component: MoveArrowButton,
    args: { label: 'One place forward', disabled: false, onClick: fn(), icon: ArrowDown },
} satisfies Meta<typeof MoveArrowButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// At the end of its row: nothing to swap with that way.
export const Disabled: Story = {
    args: { disabled: true },
};
