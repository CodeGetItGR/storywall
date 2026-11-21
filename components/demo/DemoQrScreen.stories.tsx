import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';

import { withAppContext } from '@/.storybook/appContext';
import { storyEvent, storyModules, storyQrLink } from '@/.storybook/fixtures';
import { DemoQrScreen } from '@/components/demo/DemoQrScreen';

// Without the wishbook the page offers join and upload only, so the intro (shown when it offers join,
// upload and a wish) stays away and the picture is the page itself. The live discount is left out too:
// its countdown runs on the real clock.
const event = storyEvent({ title: 'Maria & Nikos', modules: storyModules(['posts', 'gallery']) });

const links = [storyQrLink(), storyQrLink({ id: 'qr-upload', token: 'upload-token', targetType: 'MEDIA_UPLOAD' })];

const meta = {
    title: 'Demo/DemoQrScreen',
    component: DemoQrScreen,
    args: { page: 'invite' },
    globals: { viewport: { value: 'mobile' } },
    parameters: { layout: 'fullscreen', app: { event } },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="h-dvh bg-background">
                <Story />
            </div>
        ),
    ],
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/events/:eventId/qr-links', () => HttpResponse.json(links)),
            http.get('*/api/event-invitations/:token/preview', () => new HttpResponse(null, { status: 404 })),
            http.get('*/api/discount-campaign', () => HttpResponse.json(null)),
        );
    },
} satisfies Meta<typeof DemoQrScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

// The demo's join code: the same choices as a real scan, with the plans in the join card. The gallery
// code opens the same choices.
export const JoinCode: Story = {};

// No working code to scan.
export const Unavailable: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/events/:eventId/qr-links', () => HttpResponse.json([])));
    },
};
