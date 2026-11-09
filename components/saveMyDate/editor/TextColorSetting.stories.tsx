import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fireEvent, fn, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { withEditorChrome } from '@/.storybook/editor';
import { TextColorSetting } from '@/components/saveMyDate/editor/TextColorSetting';

const meta = {
    title: 'SaveMyDate/Editor/TextColorSetting',
    component: TextColorSetting,
    decorators: [withEditorChrome],
    args: { value: '#4f4a3f', onChange: fn() },
} satisfies Meta<typeof TextColorSetting>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement, globals }) => {
        const input = within(canvasElement).getByLabelText(copyFor(globals).InvitationEditor.textColor);
        fireEvent.input(input, { target: { value: '#7a1f3d' } });
        await expect(args.onChange).toHaveBeenCalledWith('#7a1f3d');
    },
};

// A colour the theme writes in short form.
export const ShortColor: Story = {
    args: { value: '#fff' },
    tags: ['visual-skip'],
};
