import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { LONG_TEXT, LONG_TITLE, onDark, previewSection, SectionStory, storySection } from '@/.storybook/invitation';

const items = previewSection('faq').data.items;
const section = storySection('faq', { items });

const longItems = [{ id: 'long-1', question: LONG_TITLE, answer: LONG_TEXT }, ...items];
const oddItems = [...items, { id: 'q3', question: 'Τι ώρα ξεκινάει η δεξίωση;', answer: 'Στις 21:00.' }];

async function openQuestion(canvasElement: HTMLElement, question: string) {
    const button = within(canvasElement).getByRole('button', { name: question });
    await userEvent.click(button);
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    // A scripted click counts as keyboard focus, and a mouse or a finger shows no focus ring.
    button.blur();
}

const meta = {
    title: 'SaveMyDate/Info/FaqSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const OneQuestionOpen: Story = {
    play: async ({ canvasElement }) => {
        await openQuestion(canvasElement, items[0].question);
    },
};

export const AllQuestionsOpen: Story = {
    args: { section: storySection('faq', { items: oddItems }) },
    play: async ({ canvasElement }) => {
        for (const item of oddItems) await openQuestion(canvasElement, item.question);
    },
};

export const LongContent: Story = {
    args: { section: storySection('faq', { title: LONG_TITLE, items: longItems }) },
    play: async ({ canvasElement }) => {
        await openQuestion(canvasElement, LONG_TITLE);
    },
};

export const NoQuestions: Story = {
    args: { section: storySection('faq', { items: [] }) },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section) },
    play: async ({ canvasElement }) => {
        await openQuestion(canvasElement, items[0].question);
    },
};
