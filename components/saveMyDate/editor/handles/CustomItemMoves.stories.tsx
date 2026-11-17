import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { CustomItemMoves } from '@/components/saveMyDate/editor/handles/CustomItemMoves';

// An item of a custom section on the invitation's background.
const onCanvas: Decorator = (Story) => (
    <div className="smd-editor w-80 bg-[#f7f2ec] p-6 font-serif text-[#2f2b2d]">
        <Story />
    </div>
);

const meta = {
    title: 'SaveMyDate/Editor/Handles/CustomItemMoves',
    component: CustomItemMoves,
    decorators: [onCanvas],
    args: {
        moves: { canBack: true, canForward: true },
        onBack: fn(),
        onForward: fn(),
        children: <p className="py-4 text-center text-lg">Τελετή 18:00</p>,
    },
} satisfies Meta<typeof CustomItemMoves>;

export default meta;
type Story = StoryObj<typeof meta>;

// An item in the middle: it can go either way.
export const Default: Story = {
    play: async ({ canvasElement, globals, args }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).InvitationEditor.handles.itemForward }));
        await expect(args.onForward).toHaveBeenCalled();
    },
};

// The first item: it can only go forward.
export const First: Story = {
    args: { moves: { canBack: false, canForward: true } },
};

// The only item in its row: no arrows.
export const Alone: Story = {
    args: { moves: null },
};
