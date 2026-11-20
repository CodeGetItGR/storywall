import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { DemoQrJoinActions } from '@/components/demo/DemoQrJoinActions';
import { QrJoinCard } from '@/components/qrLanding/QrJoinCard';

const meta = {
    title: 'Demo/DemoQrJoinActions',
    component: DemoQrJoinActions,
    args: { plansHref: '/#pricing', demoHref: '/demo/wedding/feed' },
    decorators: [
        (Story) => (
            <div className="max-w-sm bg-background p-6">
                <QrJoinCard
                    choice="join"
                    href="/invite/inv-story"
                    coverSrc="/landing/couple-cheering-with-guests-under-lit-arch-at-night.webp"
                    title="Maria & Nikos"
                    accountHrefs={null}
                    actions={<Story />}
                />
            </div>
        ),
    ],
} satisfies Meta<typeof DemoQrJoinActions>;

export default meta;
type Story = StoryObj<typeof meta>;

// The demo's join card: the plans, and the way back to the demo.
export const InJoinCard: Story = {};

// Before the demo has loaded its event: the plans only.
export const PlansOnly: Story = {
    args: { demoHref: null },
};
