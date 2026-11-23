import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
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
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const faq = copy.sectionNames.faq;
        const page = within(document.body);
        await userEvent.click(await page.findByRole('button', { name: `${copy.preview}: ${faq}` }));
        const dialog = await page.findByRole('dialog', { name: faq }, { timeout: 10_000 });
        // The popup fades and scales in.
        await waitFor(() => expect(dialog).toBeVisible(), { timeout: 10_000 });
    },
};
