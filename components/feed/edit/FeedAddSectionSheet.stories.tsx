import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { FeedAddSectionSheet } from '@/components/feed/edit/FeedAddSectionSheet';
import { feedAddList } from '@/lib/feedAddList';
import { defaultFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import { buildFeedSectionPreviews } from '@/lib/feedSectionPreview';
import type { NewSectionType } from '@/lib/invitation/newSection';

// The wall theme: no Save my date samples, so every row previews a new section.
const previews = (types: NewSectionType[], eventType = 'WEDDING') =>
    buildFeedSectionPreviews({
        types,
        document: defaultFeedLayout(),
        theme: wallThemeDesign(null),
        media: () => undefined,
        eventType,
        samples: null,
        fonts: [],
        locale: 'en',
    });
const listFor = (eventType: string) => feedAddList(defaultFeedLayout(), eventType, []);

const meta = {
    title: 'Feed/Edit/FeedAddSectionSheet',
    component: FeedAddSectionSheet,
    args: {
        open: true,
        eventType: 'WEDDING',
        previews: previews(listFor('WEDDING')),
        tiles: null,
        onAdd: fn(),
        onClose: fn(),
    },
} satisfies Meta<typeof FeedAddSectionSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Wedding: Story = {};
export const Baptism: Story = { args: { eventType: 'BAPTISM', previews: previews(listFor('BAPTISM'), 'BAPTISM') } };
export const NothingLeft: Story = { args: { previews: previews([]) } };

// The eye opens the section's preview in a small window.
export const PreviewOpen: Story = {
    args: { previews: previews(['faq', 'dressCode']) },
    play: async () => {
        const page = within(document.body);
        await userEvent.click(await page.findByRole('button', { name: 'Preview: FAQ' }));
        await expect(await page.findByRole('dialog', { name: 'FAQ' })).toBeVisible();
    },
};
