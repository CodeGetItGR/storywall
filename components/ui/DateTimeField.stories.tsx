import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { DateTimeField } from '@/components/ui/DateTimeField';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';

const INPUT_CLASS = 'rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink transition outline-none focus:ring-2 focus:ring-primary/30';

const meta = {
    title: 'UI/DateTimeField',
    component: DateTimeField,
    args: { inputClassName: INPUT_CLASS, onChange: fn() },
    decorators: [
        (Story) => (
            <FormFieldLabel label="Starts" required className="max-w-md">
                <Story />
            </FormFieldLabel>
        ),
    ],
} satisfies Meta<typeof DateTimeField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
    args: { value: '' },
};

export const Filled: Story = {
    args: { value: '2026-07-18T18:30' },
};

export const Invalid: Story = {
    args: { value: '2026-07-18T18:30', 'aria-invalid': true, inputClassName: `${INPUT_CLASS} ring-2 ring-rose-400` },
};

export const Disabled: Story = {
    args: { value: '2026-07-18T18:30', disabled: true },
};

function ControlledDateTimeField() {
    const [value, setValue] = useState('2026-07-18T18:30');
    return <DateTimeField value={value} onChange={setValue} min="2026-06-15T00:00" inputClassName={INPUT_CLASS} />;
}

export const Interactive: Story = {
    render: () => <ControlledDateTimeField />,
};
