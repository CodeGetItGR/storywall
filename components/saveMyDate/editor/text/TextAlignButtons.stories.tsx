import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { withEditorChrome } from '@/.storybook/editor';
import { TextAlignButtons } from '@/components/saveMyDate/editor/text/TextAlignButtons';

const meta = {
    title: 'SaveMyDate/Editor/Text/TextAlignButtons',
    component: TextAlignButtons,
    decorators: [withEditorChrome],
    args: { value: 'center', onChange: fn() },
} satisfies Meta<typeof TextAlignButtons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('button', { name: copy.alignCenter })).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(canvas.getByRole('button', { name: copy.alignLeft }));
        await expect(args.onChange).toHaveBeenCalledWith('left');
    },
};

export const Right: Story = { args: { value: 'right' } };
