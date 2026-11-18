import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Bold } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withEditorChrome } from '@/.storybook/editor';
import { TextToolbarButton } from '@/components/saveMyDate/editor/text/TextToolbarButton';

const meta = {
    title: 'SaveMyDate/Editor/Text/TextToolbarButton',
    component: TextToolbarButton,
    decorators: [withEditorChrome],
    args: { label: 'Bold', onClick: fn(), children: <Bold aria-hidden="true" /> },
} satisfies Meta<typeof TextToolbarButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { pressed: false },
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Bold' }));
        await expect(args.onClick).toHaveBeenCalledOnce();
    },
};

export const Pressed: Story = { args: { pressed: true } };

export const Disabled: Story = { args: { disabled: true } };
