import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';

import { withAppContext } from '@/.storybook/appContext';
import { STORY_EVENT_ID, storyMember, storyModules } from '@/.storybook/fixtures';
import type { MediaResponseDto, QrLinkResolutionDto } from '@/lib/api/types';

import QrCodeLandingBoundary from './QrCodeLandingBoundary';

// The event's join code on a full plan with a wishbook: join, upload and, without an account, a wish.
const joinCode: QrLinkResolutionDto = {
    status: 'ACTIVE',
    targetType: 'EVENT_JOIN',
    guestActions: ['WISH'],
    eventId: STORY_EVENT_ID,
    eventTitle: 'Eleni & Nikos',
    eventSubtitle: null,
    coverMedia: null,
    theme: null,
    eventStatus: 'ACTIVE',
    inviteToken: 'inv-story',
    requiresAuth: true,
    requiresGuestKey: true,
    uploadToken: 'up-story',
    wishToken: 'join-story',
};

const meta = {
    title: 'QrLanding/QrCodeLandingBoundary',
    component: QrCodeLandingBoundary,
    globals: { viewport: { value: 'mobile' } },
    args: { token: 'join-story' },
    parameters: { layout: 'fullscreen', app: { user: null, event: null, member: null } },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="h-screen">
                <Story />
            </div>
        ),
    ],
    beforeEach({ msw }) {
        msw.use(http.get('*/api/qr/:token', () => HttpResponse.json(joinCode)));
    },
} satisfies Meta<typeof QrCodeLandingBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

// Someone without an account scans the code: join, upload or leave a wish. The language switcher sits top right.
export const Visitor: Story = {};

export const VisitorGreek: Story = { globals: { locale: 'el' } };

// An event with a cover photo: the switcher floats over the photo's top-right corner.
export const VisitorWithCover: Story = {
    beforeEach({ msw }) {
        const coverMedia = { id: 'cover', mediaUrl: '/images/banner.jpg', mediaType: 'IMAGE' } as unknown as MediaResponseDto;
        msw.use(http.get('*/api/qr/:token', () => HttpResponse.json({ ...joinCode, coverMedia })));
    },
};

// A signed-in member: open the event, upload as themselves, or open the wishbook.
export const Member: Story = {
    parameters: { app: { event: null, member: null } },
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/me/events', () => HttpResponse.json([storyMember()])),
            http.get('*/api/events/:eventId/modules', () => HttpResponse.json(storyModules())),
        );
    },
};

// The feed's Photos action: a member lands straight on the upload form, with a way back to the choices.
export const MemberFromFeedPhotos: Story = {
    ...Member,
    parameters: { ...Member.parameters, nextjs: { navigation: { query: { choice: 'upload' } } } },
};
