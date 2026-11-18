import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { ThemeSwitchPanel } from '@/components/saveMyDate/editor/theme/ThemeSwitchPanel';

const meta = {
    title: 'SaveMyDate/Editor/ThemeSwitchPanel',
    component: ThemeSwitchPanel,
    args: { themeName: 'Olive', onChange: fn() },
    decorators: [
        (Story) => (
            <div className="w-80 p-4 text-sm">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof ThemeSwitchPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement, globals }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).InvitationEditor.themeSwitch.change }));
        await expect(args.onChange).toHaveBeenCalledOnce();
    },
};
