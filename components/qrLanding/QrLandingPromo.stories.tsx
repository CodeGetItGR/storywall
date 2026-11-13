import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';

import { withAppContext } from '@/.storybook/appContext';
import { QrLandingPromo } from '@/components/qrLanding/QrLandingPromo';

// The live-campaign state is left out: its countdown runs on the real clock, so its picture would
// change from one run to the next.

const meta = {
    title: 'QrLanding/QrLandingPromo',
    component: QrLandingPromo,
    decorators: [
        withAppContext,
        (Story) => (
            <div className="max-w-sm bg-background p-6">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof QrLandingPromo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Teaser: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/discount-campaign', () => HttpResponse.json(null)));
    },
};
