import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { ColumnBreakMarker } from '@/components/saveMyDate/editor/handles/ColumnBreakMarker';

const onCanvas: Decorator = (Story) => (
    <div className="smd-editor grid min-h-24 place-items-center bg-[#f7f2ec] p-6">
        <Story />
    </div>
);

const meta = {
    title: 'SaveMyDate/Editor/Handles/ColumnBreakMarker',
    component: ColumnBreakMarker,
    decorators: [onCanvas],
    args: { moves: { canBack: true, canForward: true }, onBack: fn(), onForward: fn() },
} satisfies Meta<typeof ColumnBreakMarker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Nothing left in the right column: the split can only move back.
export const AtEnd: Story = {
    args: { moves: { canBack: true, canForward: false } },
};
