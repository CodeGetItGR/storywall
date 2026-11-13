import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { CodeInput } from '@/components/ui/CodeInput';

const meta = {
    title: 'UI/CodeInput',
    component: CodeInput,
    args: { label: 'Code', length: 6, value: '', onChange: () => {} },
    decorators: [
        (Story) => (
            <div className="max-w-sm bg-card p-6">
                <Story />
            </div>
        ),
    ],
    // Typing works in every story: the field keeps its own value.
    render: function Render(args) {
        const [value, setValue] = useState(args.value);
        return <CodeInput {...args} value={value} onChange={setValue} />;
    },
} satisfies Meta<typeof CodeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

// The grey boxes on the gift claim and the delete steps.
export const Muted: Story = {
    args: { value: '12' },
};

// The account wizard's cream boxes.
export const Cream: Story = {
    args: { tone: 'cream', value: '12' },
};

// Any number of digits: a four-digit code.
export const FourDigits: Story = {
    args: { length: 4, value: '7' },
};

export const Invalid: Story = {
    args: { value: '123456', invalid: true },
};

export const Disabled: Story = {
    args: { value: '123', disabled: true },
};

// A paste fills every box and drops what isn't a digit.
export const Paste: Story = {
    async play({ canvasElement }) {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByLabelText('Code'));
        await userEvent.paste('12 34-56');
        await expect(canvas.getAllByTestId('code-box').map((box) => box.textContent)).toEqual(['1', '2', '3', '4', '5', '6']);
    },
};
