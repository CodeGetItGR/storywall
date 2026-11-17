import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Undo2 } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withEditorChrome } from '@/.storybook/editor';
import { EditorIconButton } from '@/components/saveMyDate/editor/EditorIconButton';

const meta = {
    title: 'SaveMyDate/Editor/EditorIconButton',
    component: EditorIconButton,
    decorators: [withEditorChrome],
    args: { label: 'Undo', onClick: fn(), children: <Undo2 aria-hidden="true" /> },
} satisfies Meta<typeof EditorIconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: args.label }));
        await expect(args.onClick).toHaveBeenCalledOnce();
    },
};

export const Disabled: Story = {
    args: { disabled: true },
};
