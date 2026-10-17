import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';

const INPUT_CLASS =
    'rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-primary/30';

const meta = {
    title: 'UI/FormFieldLabel',
    component: FormFieldLabel,
    args: {
        label: 'Event title',
        className: 'max-w-sm',
        children: <input className={INPUT_CLASS} placeholder="Maria & Kostas" />,
    },
} satisfies Meta<typeof FormFieldLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Required: Story = {
    args: { required: true },
};

export const Optional: Story = {
    args: { optional: true, label: 'Venue' },
};
