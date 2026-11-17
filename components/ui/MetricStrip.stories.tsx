import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { type Metric, MetricStrip, MetricStripSkeleton } from '@/components/ui/MetricStrip';

const METRICS: Metric[] = [
    { key: 'invited', label: 'Invited', value: 120 },
    { key: 'attending', label: 'Attending', value: 86, tone: 'text-emerald-600' },
    { key: 'maybe', label: 'Maybe', value: 9 },
    { key: 'declined', label: 'Declined', value: 7, tone: 'text-rose-600' },
    { key: 'pending', label: 'Pending', value: 18 },
    { key: 'guests', label: 'Guests', value: 142 },
];

const meta = {
    title: 'UI/MetricStrip',
    component: MetricStrip,
    args: { items: METRICS.slice(0, 4) },
} satisfies Meta<typeof MetricStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Four: Story = {};

export const Two: Story = { args: { items: METRICS.slice(0, 2) } };

export const Three: Story = { args: { items: METRICS.slice(0, 3) } };

export const Five: Story = { args: { items: METRICS.slice(0, 5) } };

export const Six: Story = { args: { items: METRICS } };

export const Loading: Story = {
    render: () => <MetricStripSkeleton count={4} />,
};
