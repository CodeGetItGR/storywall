import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { JourneyTotals } from '@/components/manage/overview/JourneyTotals';

const meta = {
    title: 'Manage/Overview/JourneyTotals',
    component: JourneyTotals,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof JourneyTotals>;

export default meta;
type Story = StoryObj<typeof meta>;

export const English: Story = {
    args: {
        totals: [
            { key: 'media', icon: 'media', value: 14, label: 'Media' },
            { key: 'wishbook', icon: 'wishbook', value: 3, label: 'Wishbook' },
        ],
    },
};

// The Greek media label is too long for half a phone's width: it takes the whole row.
export const Greek: Story = {
    args: {
        totals: [
            { key: 'media', icon: 'media', value: 11, label: 'Φωτογραφίες & Βίντεο' },
            { key: 'wishbook', icon: 'wishbook', value: 3, label: 'Βιβλίο Ευχών' },
        ],
    },
};

export const OneTotal: Story = {
    args: {
        totals: [{ key: 'wishbook', icon: 'wishbook', value: 3, label: 'Βιβλίο Ευχών' }],
    },
};
