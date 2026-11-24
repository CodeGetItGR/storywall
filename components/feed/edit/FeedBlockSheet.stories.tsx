import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ComponentProps, useCallback, useState } from 'react';
import { fn } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { FeedBlockSheet } from '@/components/feed/edit/FeedBlockSheet';
import type { PinnedPhoto } from '@/lib/feedPinned';

const PHOTOS = ['/images/post-florals.png', '/images/post-cake.png', '/images/post-flowers.png'];

// The picture's own path is its id here.
const media = (id: string) => id.split('#')[0];

const photosOf = (count: number): PinnedPhoto[] =>
    Array.from({ length: count }, (_, i) => ({ id: `p${i}`, image: { source: 'media', mediaId: `${PHOTOS[i % PHOTOS.length]}#${i}` } }));

type SheetProps = { title: string; isDesktop: boolean } & Partial<ComponentProps<typeof FeedBlockSheet>>;

function Sheet(props: SheetProps) {
    return (
        <FeedBlockSheet
            open
            scope={null}
            groups={[]}
            parts={[]}
            partLabels={{ cover: '', title: '', date: '', location: '', description: '' }}
            membersOnly={null}
            onMembersOnly={fn()}
            promptText={null}
            onPromptText={fn()}
            pinned={null}
            pinnedUploading={false}
            media={media}
            onAddPinned={fn()}
            onRemovePinned={fn()}
            onMovePinned={fn()}
            onOpenPart={fn()}
            onClose={fn()}
            {...props}
        />
    );
}

type SheetArgs = { title: string; isDesktop: boolean };

// The photo prompt's sheet, typing into it. Also shows FeedPromptField.
function PromptSheet(args: SheetArgs) {
    const [value, setValue] = useState('');
    return <Sheet {...args} promptText={value} onPromptText={setValue} />;
}

// Pinned photos' sheet, taking photos out of it. Also shows FeedPinnedField and FeedPinnedTile.
function PinnedSheet({ count, uploading = false, ...args }: SheetArgs & { count: number; uploading?: boolean }) {
    const [photos, setPhotos] = useState(() => photosOf(count));
    const remove = useCallback((id: string) => setPhotos((list) => list.filter((photo) => photo.id !== id)), []);
    return <Sheet {...args} pinned={photos} pinnedUploading={uploading} onRemovePinned={remove} />;
}

const meta = {
    title: 'Feed/Edit/FeedBlockSheet',
    component: PromptSheet,
    args: { title: '', isDesktop: true },
    parameters: { layout: 'fullscreen' },
    // The app's own name for the section, in the language the story is shown in.
    render: (args, { globals }) => <PromptSheet {...args} title={copyFor(globals).InvitationEditor.sectionNames.feedPrompt} />,
    decorators: [
        (Story) => (
            <div className="min-h-120">
                <Story />
            </div>
        ),
    ],
    play: async () => {
        await waitForOpen('dialog');
    },
} satisfies Meta<typeof PromptSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

const pinnedStory = (count: number, uploading = false): Story => ({
    render: (args, { globals }) => (
        <PinnedSheet {...args} count={count} uploading={uploading} title={copyFor(globals).InvitationEditor.sectionNames.feedPinned} />
    ),
});
const onPhone: Story = { args: { isDesktop: false }, globals: { viewport: { value: 'mobile' } } };

// A Save my date section: a photo in it, and its text's colour. Also shows FeedSectionContentFields.
const content = { textColor: '#4A3B32', themeColors: ['#7A3B2E', '#F5E6D3'], uploading: false, failed: false, onPhoto: fn(), onTextColor: fn() };
const section: Story = {
    render: (args, { globals }) => (
        <Sheet {...args} title={copyFor(globals).InvitationEditor.sectionNames.dressCode} content={content} membersOnly={false} />
    ),
};

export const PhotoPrompt: Story = {};
export const PhotoPromptMobile: Story = onPhone;

export const InvitationSection: Story = section;
export const InvitationSectionMobile: Story = { ...section, ...onPhone };

export const PinnedPhotos: Story = pinnedStory(3);
export const PinnedPhotosMobile: Story = { ...pinnedStory(3), ...onPhone };
export const PinnedPhotosEmpty: Story = pinnedStory(0);
// Six is the most: no Add photo tile.
export const PinnedPhotosFull: Story = pinnedStory(6);
export const PinnedPhotosUploading: Story = pinnedStory(1, true);
