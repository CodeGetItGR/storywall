import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { expect, userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { EmailVerificationBanner } from '@/components/common/EmailVerificationBanner';

const RESEND_URL = '*/api/auth/resend-verification';

const meta = {
    title: 'Common/EmailVerificationBanner',
    component: EmailVerificationBanner,
    decorators: [withAppContext],
} satisfies Meta<typeof EmailVerificationBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sending: Story = {
    beforeEach({ msw }) {
        msw.use(http.post(RESEND_URL, () => delay('infinite')));
    },
    async play({ canvasElement }) {
        await userEvent.click(within(canvasElement).getByRole('button'));
    },
};

export const Sent: Story = {
    beforeEach({ msw }) {
        msw.use(http.post(RESEND_URL, () => new HttpResponse(null, { status: 204 })));
    },
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).EmailVerificationBanner;
        await userEvent.click(within(canvasElement).getByRole('button'));
        await expect(await within(canvasElement).findByRole('button', { name: copy.resendSent })).toBeDisabled();
    },
};

export const Failed: Story = {
    beforeEach({ msw }) {
        msw.use(http.post(RESEND_URL, () => HttpResponse.json({ errorCode: 9001, status: 500 }, { status: 500 })));
    },
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).EmailVerificationBanner;
        await userEvent.click(within(canvasElement).getByRole('button'));
        await within(canvasElement).findByText(copy.resendError);
    },
};
