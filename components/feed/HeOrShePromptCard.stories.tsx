import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { expect, userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyEvent, storyModules } from '@/.storybook/fixtures';
import { HeOrShePromptCard } from '@/components/feed/HeOrShePromptCard';
import type { HeOrSheViewDto } from '@/lib/api/types';

const openView: HeOrSheViewDto = {
    status: 'OPEN',
    closesAt: '2026-06-18T20:30:00Z',
    canGuess: true,
    myGuess: null,
    tally: null,
    questions: [],
    myAnswers: {},
};

function viewHandler(view: HeOrSheViewDto) {
    return http.get('*/api/events/:eventId/he-or-she', () => HttpResponse.json(view));
}

const meta = {
    title: 'Feed/HeOrShePromptCard',
    component: HeOrShePromptCard,
    args: { eventId: 'evt-story', eventType: 'GENDER_REVEAL', enabled: true },
    parameters: {
        app: {
            event: storyEvent({ eventType: 'GENDER_REVEAL', title: 'Baby Alexiou', modules: storyModules(['posts', 'stories', 'gallery', 'he_or_she']) }),
        },
    },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="mx-auto max-w-2xl">
                <Story />
            </div>
        ),
    ],
    beforeEach({ msw }) {
        msw.use(viewHandler(openView));
    },
} satisfies Meta<typeof HeOrShePromptCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const NoClosingTime: Story = {
    beforeEach({ msw }) {
        msw.use(viewHandler({ ...openView, closesAt: null }));
    },
};

export const Sending: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.put('*/api/events/:eventId/he-or-she/answers', async () => {
                await delay('infinite');
                return HttpResponse.json(openView);
            }),
        );
    },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const he = copyFor(globals).HeOrShePage.he;
        await userEvent.click(await canvas.findByRole('button', { name: he }));
        await expect(canvas.getByRole('button', { name: he })).toBeDisabled();
    },
};

export const SendFailed: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.put('*/api/events/:eventId/he-or-she/answers', () => HttpResponse.json({ status: 500, errorCode: 'INTERNAL_ERROR' }, { status: 500 })),
        );
    },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: copyFor(globals).HeOrShePage.she }));
        await canvas.findByRole('alert');
    },
};
