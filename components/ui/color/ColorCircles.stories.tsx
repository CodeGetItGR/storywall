import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn, screen, userEvent, within } from 'storybook/test';

import { withEditorChrome } from '@/.storybook/editor';
import { ColorCircles } from '@/components/ui/color/ColorCircles';

const meta = {
    title: 'UI/ColorCircles',
    component: ColorCircles,
    args: { value: undefined, onChange: fn(), label: 'Solid color' },
} satisfies Meta<typeof ColorCircles>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NothingPicked: Story = { decorators: [withEditorChrome] };
export const Picked: Story = { decorators: [withEditorChrome], args: { value: '#B5BFA6' } };
export const OwnColor: Story = { decorators: [withEditorChrome], args: { value: '#2E5E4E' } };
export const ThemeColors: Story = { decorators: [withEditorChrome], args: { themeColors: ['#7A3B2E', '#F5E6D3', '#FFFFFF'], value: '#F5E6D3' } };
export const Disabled: Story = { decorators: [withEditorChrome], args: { value: '#AC9FC7', disabled: true } };

export const Mixer: Story = {
    decorators: [withEditorChrome],
    args: { value: '#AC9FC7' },
    render: (args) => (
        <div className="pt-72">
            <ColorCircles {...args} />
        </div>
    ),
    play: async ({ canvasElement }) => {
        const buttons = within(canvasElement).getAllByRole('button');
        await userEvent.click(buttons[buttons.length - 1]);
        await screen.findByText('#AC9FC7');
    },
};

// On a light surface, as in the admin.
export const Light: Story = {
    args: { surface: 'light', value: '#CFB98C' },
    render: (args) => (
        <div className="rounded-2xl bg-white p-4">
            <ColorCircles {...args} />
        </div>
    ),
};
