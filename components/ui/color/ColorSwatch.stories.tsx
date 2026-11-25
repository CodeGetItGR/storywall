import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn, userEvent, within } from 'storybook/test';

import { withEditorChrome } from '@/.storybook/editor';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { ColorSwatch } from '@/components/ui/color/ColorSwatch';

const meta = {
    title: 'UI/ColorSwatch',
    component: ColorSwatch,
    args: { value: '#7A3B2E', label: 'Main color', themeColors: ['#7A3B2E', '#F5E6D3', '#2F2B2D'], onChange: fn() },
} satisfies Meta<typeof ColorSwatch>;

export default meta;
type Story = StoryObj<typeof meta>;

const open: Story['play'] = async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await waitForOpen('dialog');
};

export const Closed: Story = { decorators: [withEditorChrome] };

export const Open: Story = {
    decorators: [withEditorChrome],
    render: (args) => (
        <div className="flex justify-end pt-40">
            <ColorSwatch {...args} />
        </div>
    ),
    play: open,
};

// The admin's, with no theme.
export const Light: Story = {
    args: { surface: 'light', themeColors: undefined, value: '#CFB98C' },
    render: (args) => (
        <div className="rounded-2xl bg-white p-4 pt-40">
            <ColorSwatch {...args} />
        </div>
    ),
    play: open,
};
