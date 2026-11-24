import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withEditorChrome } from '@/.storybook/editor';
import { TextColorSetting } from '@/components/saveMyDate/editor/TextColorSetting';

const meta = {
    title: 'SaveMyDate/Editor/TextColorSetting',
    component: TextColorSetting,
    decorators: [withEditorChrome],
    args: { value: '#4f4a3f', themeColors: ['#b8dfd3', '#efe7ec', '#4f4a3f'], onChange: fn() },
} satisfies Meta<typeof TextColorSetting>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: '#AC9FC7' }));
        await expect(args.onChange).toHaveBeenCalledWith('#AC9FC7');
    },
};

// A colour the theme writes in short form.
export const ShortColor: Story = {
    args: { value: '#fff' },
    tags: ['visual-skip'],
};
