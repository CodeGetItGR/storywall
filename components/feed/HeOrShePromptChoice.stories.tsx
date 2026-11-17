import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { HeOrShePromptChoice } from '@/components/feed/HeOrShePromptChoice';

const meta = {
    title: 'Feed/HeOrShePromptChoice',
    component: HeOrShePromptChoice,
    args: { value: 'HE', label: 'Boy', disabled: false, onChooseAction: fn() },
} satisfies Meta<typeof HeOrShePromptChoice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Boy: Story = {};

export const Girl: Story = {
    args: { value: 'SHE', label: 'Girl' },
};

export const Disabled: Story = {
    args: { disabled: true },
};
