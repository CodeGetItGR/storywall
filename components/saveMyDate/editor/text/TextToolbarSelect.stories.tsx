import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withEditorChrome } from '@/.storybook/editor';
import { TextToolbarSelect } from '@/components/saveMyDate/editor/text/TextToolbarSelect';

const meta = {
    title: 'SaveMyDate/Editor/Text/TextToolbarSelect',
    component: TextToolbarSelect,
    decorators: [withEditorChrome],
    args: {
        label: 'Size',
        value: '20',
        onChange: fn(),
        children: [16, 20, 24].map((size) => (
            <option key={size} value={size}>
                {size}
            </option>
        )),
    },
} satisfies Meta<typeof TextToolbarSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.selectOptions(within(canvasElement).getByLabelText('Size'), '24');
        await expect(args.onChange).toHaveBeenCalledOnce();
    },
};
