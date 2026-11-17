import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { PublishPlanStep } from '@/components/saveMyDate/editor/publish/PublishPlanStep';
import type { InvitationEventCheckout } from '@/hooks/useInvitationEventCheckout';
import { sampleInvitationPlan } from '@/lib/invitation/samplePlan';

const checkout = (state: Partial<InvitationEventCheckout> = {}): InvitationEventCheckout => ({
    plans: [sampleInvitationPlan()],
    modules: [],
    media: { presignedUrlTtlMinutes: 60 } as InvitationEventCheckout['media'],
    isLoadingPlans: false,
    selectedCode: 'PREMIUM',
    durationPicks: {},
    selectPlan: fn(),
    selectDuration: fn(),
    needsTitle: false,
    title: '',
    onTitleChange: fn(),
    needsStart: false,
    startAt: '',
    startAtMin: '2026-06-15T12:00',
    onStartAtChange: fn(),
    consent: {
        termsVersion: '2026-01',
        requestsImmediateStart: false,
        acknowledgesWithdrawalTerms: false,
        staleTerms: false,
        consentSatisfied: false,
        handleRequestsImmediateStartChange: fn(),
        handleAcknowledgesWithdrawalTermsChange: fn(),
        handleCheckoutError: fn(() => false),
    },
    canSubmit: false,
    isPending: false,
    error: null,
    submit: fn(async (event) => event.preventDefault()),
    ...state,
});

const meta = {
    title: 'SaveMyDate/Editor/Publish/PublishPlanStep',
    component: PublishPlanStep,
    decorators: [
        (Story) => (
            <div className="max-w-4xl bg-white p-5 text-sm text-ink">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    args: { checkout: checkout(), onBack: fn() as (() => void) | null, onCancel: fn() },
} satisfies Meta<typeof PublishPlanStep>;

export default meta;
type Story = StoryObj<typeof meta>;

// The invitation gives the names and the date: only the plan and the consent are left.
export const FromInvitation: Story = {
    play: async ({ args, canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const canvas = within(canvasElement);
        await expect(canvas.queryByText(copy.eventName)).not.toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: copy.continueToPayment })).toBeDisabled();
        await userEvent.click(canvas.getByRole('button', { name: copy.back }));
        await expect(args.onBack).toHaveBeenCalledOnce();
    },
};

// The invitation has no names and its date has passed: the host gives both.
export const AsksForMissing: Story = {
    args: { checkout: checkout({ needsTitle: true, needsStart: true }), onBack: null },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const canvas = within(canvasElement);
        await expect(canvas.getByLabelText(copy.eventName)).toBeVisible();
        await expect(canvas.getByText(copy.eventStart)).toBeVisible();
        await expect(canvas.getByRole('button', { name: copy.cancel })).toBeVisible();
    },
};

export const Ready: Story = {
    args: {
        checkout: checkout({
            canSubmit: true,
            consent: { ...checkout().consent, requestsImmediateStart: true, acknowledgesWithdrawalTerms: true, consentSatisfied: true },
        }),
    },
    play: async ({ canvasElement, globals }) => {
        await expect(within(canvasElement).getByRole('button', { name: copyFor(globals).InvitationEditor.continueToPayment })).toBeEnabled();
    },
};

export const Paying: Story = { args: { checkout: checkout({ canSubmit: false, isPending: true }) } };

export const Failed: Story = { args: { checkout: checkout({ error: 'Payment could not start. Try again.' }) } };

// No plan sells the invitation yet: the host can only go back.
export const NoPlans: Story = {
    args: { checkout: checkout({ plans: [] }), onBack: null },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copy.noInvitationPlans)).toBeVisible();
        await expect(canvas.queryByRole('button', { name: copy.continueToPayment })).not.toBeInTheDocument();
    },
};

export const LoadingPlans: Story = { args: { checkout: checkout({ plans: [], isLoadingPlans: true }) } };
