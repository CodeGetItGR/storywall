import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';

import { withAppContext } from '@/.storybook/appContext';
import { storyMedia, storyUser } from '@/.storybook/fixtures';
import { GiftClaimScreen } from '@/components/giftMode/GiftClaimScreen';
import type { GiftClaimPreviewDto } from '@/lib/api/types';

const PREVIEW_URL = '*/api/gift-claims/:token';

function preview(overrides: Partial<GiftClaimPreviewDto> = {}): GiftClaimPreviewDto {
    return {
        eventTitle: 'Eleni & Nikos',
        eventSubtitle: null,
        coverMedia: storyMedia('cover', { mediaUrl: '/landing/03-wedding-ceremony-santorini.webp' }),
        giverDisplayName: 'Maria',
        recipientLabel: 'Eleni & Nikos',
        emailBound: true,
        callerIsRecipient: null,
        state: 'CLAIMABLE',
        ...overrides,
    };
}

const signedIn = storyUser;

const meta = {
    title: 'Gift Mode/GiftClaimScreen',
    component: GiftClaimScreen,
    decorators: [withAppContext],
    parameters: { layout: 'fullscreen', app: { event: null, member: null, user: null } },
    args: { token: 'gift-token' },
} satisfies Meta<typeof GiftClaimScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sign in to claim, or create an account.
export const SignedOut: Story = {
    beforeEach({ msw }) {
        msw.use(http.get(PREVIEW_URL, () => HttpResponse.json(preview())));
    },
};

// The recipient's account: one tap, no PIN.
export const Recipient: Story = {
    parameters: { app: { event: null, member: null, user: signedIn } },
    beforeEach({ msw }) {
        msw.use(http.get(PREVIEW_URL, () => HttpResponse.json(preview({ callerIsRecipient: true }))));
    },
};

// Any other account: the PIN box from the start.
export const OtherAccount: Story = {
    parameters: { app: { event: null, member: null, user: signedIn } },
    beforeEach({ msw }) {
        msw.use(http.get(PREVIEW_URL, () => HttpResponse.json(preview({ callerIsRecipient: false }))));
    },
};
