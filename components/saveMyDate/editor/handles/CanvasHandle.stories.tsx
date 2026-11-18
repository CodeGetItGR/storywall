import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { CanvasHandle } from '@/components/saveMyDate/editor/handles/CanvasHandle';

// A handle on a light invitation background, the way it sits on the canvas.
const onCanvas: Decorator = (Story) => (
    <div className="smd-editor grid min-h-40 place-items-center bg-[#f7f2ec] p-8">
        <div className="relative">
            <Story />
        </div>
    </div>
);

const meta = {
    title: 'SaveMyDate/Editor/Handles/CanvasHandle',
    component: CanvasHandle,
    decorators: [onCanvas],
    args: {
        variant: 'bar',
        label: 'Drag to change the height. Double-tap to reset.',
        value: 420,
        min: 44,
        max: 3000,
        valueText: '420 px',
        isDragging: false,
        handlers: {
            onPointerDown: fn(),
            onPointerMove: fn(),
            onPointerUp: fn(),
            onPointerCancel: fn(),
            onKeyDown: fn(),
        },
    },
} satisfies Meta<typeof CanvasHandle>;

export default meta;
type Story = StoryObj<typeof meta>;

// A section's height: the grey bar on its bottom edge.
export const SectionBar: Story = {};

// Turns green while it is dragged.
export const Dragging: Story = {
    args: { isDragging: true },
};

// The space above or below a text (admins).
export const TextSpacing: Story = {
    args: { variant: 'text', label: 'Drag to change the space below the text', value: 18, min: -60, max: 120, valueText: '18 px' },
};

// A spacer's height, across its middle.
export const Spacer: Story = {
    args: { variant: 'spacer', label: 'Drag to change the space', value: 40, min: 8, max: 600, valueText: '40 px', className: 'w-64' },
};

// An image's or a photo frame's size: the green dot on its corner.
export const SizeDot: Story = {
    args: { variant: 'dot', label: 'Drag to resize', value: 260, min: 40, max: 600, valueText: '260 px' },
};
