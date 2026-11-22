import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { FeedAddSectionSheet } from '@/components/feed/edit/FeedAddSectionSheet';
import { defaultFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import { buildFeedSectionPreviews } from '@/lib/feedSectionPreview';
import type { NewSectionType } from '@/lib/invitation/newSection';

// The wall theme: no Save my date samples, so every card is a new section.
const previews = (types: NewSectionType[]) =>
    buildFeedSectionPreviews({
        types,
        document: defaultFeedLayout(),
        theme: wallThemeDesign(null),
        media: () => undefined,
        eventType: 'WEDDING',
        samples: null,
        fonts: [],
        locale: 'en',
    });

const meta = {
    title: 'Feed/Edit/FeedAddSectionSheet',
    component: FeedAddSectionSheet,
    args: {
        open: true,
        previews: previews(['coupleNames', 'dressCode', 'faq']),
        onAdd: fn(),
        onClose: fn(),
    },
} satisfies Meta<typeof FeedAddSectionSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cards: Story = {};
export const EmptyGallery: Story = { args: { previews: previews(['gallery', 'faq']) } };
export const NothingToAdd: Story = { args: { previews: previews([]) } };
