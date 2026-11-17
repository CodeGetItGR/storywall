import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { EditorTourCard } from '@/components/saveMyDate/editor/tour/EditorTourCard';
import { EditorTourToolRows } from '@/components/saveMyDate/editor/tour/EditorTourToolRows';
import en from '@/messages/en.json';

const tour = en.InvitationEditor.tour;

const meta = {
    title: 'SaveMyDate/Editor/Tour/EditorTourCard',
    component: EditorTourCard,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div className="h-svh bg-[rgba(10,11,14,0.8)]">
                <Story />
            </div>
        ),
    ],
    args: {
        placement: { kind: 'center' },
        stepKey: 'welcome',
        position: 1,
        total: 6,
        title: tour.welcomeTitle,
        body: tour.welcomeBody,
        isFirst: true,
        isLast: false,
        onBack: fn(),
        onNext: fn(),
        onSkip: fn(),
    },
} satisfies Meta<typeof EditorTourCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// The first step has no Back.
export const First: Story = {
    play: async ({ args, canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const card = within(canvasElement);
        await expect(card.queryByRole('button', { name: copy.back })).toBeNull();
        await userEvent.click(card.getByRole('button', { name: copy.tour.skip }));
        await expect(args.onSkip).toHaveBeenCalledOnce();
    },
};

// A step beside the part it talks about.
export const Beside: Story = {
    tags: ['visual-desktop-only'],
    args: {
        placement: { kind: 'beside', left: 120, top: 120 },
        stepKey: 'add',
        position: 3,
        title: tour.addTitle,
        body: tour.addBody,
        isFirst: false,
    },
    play: async ({ args, canvasElement, globals }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).InvitationEditor.back }));
        await expect(args.onBack).toHaveBeenCalledOnce();
    },
};

// On a phone the card sits along the bottom.
export const Bottom: Story = {
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    args: { placement: { kind: 'bottom' }, stepKey: 'text', position: 2, title: tour.textTitle, body: tour.textBody, isFirst: false },
};

export const SectionTools: Story = {
    args: {
        stepKey: 'sectionTools',
        position: 5,
        title: tour.sectionToolsTitle,
        body: tour.sectionToolsBody,
        isFirst: false,
        children: <EditorTourToolRows />,
    },
};

// The last step says Done.
export const Last: Story = {
    args: { stepKey: 'publish', position: 6, title: tour.publishTitle, body: tour.publishBody, isFirst: false, isLast: true },
    play: async ({ args, canvasElement, globals }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).InvitationEditor.tour.done }));
        await expect(args.onNext).toHaveBeenCalledOnce();
    },
};
