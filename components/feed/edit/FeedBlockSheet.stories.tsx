import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ComponentProps, useCallback, useState } from 'react';
import { fn } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { useStoryPanel } from '@/.storybook/sectionSettings';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { FeedBlockSheet } from '@/components/feed/edit/FeedBlockSheet';
import type { FeedSectionBackground } from '@/components/feed/edit/FeedSectionBackgroundFields';
import type { FeedSectionContent } from '@/hooks/useFeedSectionContent';
import { feedSettingsGroups } from '@/lib/feedEditing';
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

// A sample section's whole sheet: its inputs, Add photo, Members only, then its styling.
function SectionSheet({ sectionId, ...args }: SheetArgs & { sectionId: string }) {
    const { scope, groups } = useStoryPanel(sectionId, false);
    const [content] = useState(() => contentWith());
    return <Sheet {...args} scope={scope} groups={feedSettingsGroups(groups)} content={content} membersOnly={false} />;
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

// A Save my date section: a photo in it, its text's colour, and its own background. Also shows FeedSectionPhotoField,
// FeedSectionTextColorField and FeedSectionBackgroundFields.
const noBackground: FeedSectionBackground = { color: undefined, hasPhoto: false, failed: false, onColor: fn(), onPickPhoto: fn(), onRemovePhoto: fn() };
const contentWith = (background: Partial<FeedSectionBackground> = {}): FeedSectionContent => ({
    textColor: '#4A3B32',
    themeColors: ['#7A3B2E', '#F5E6D3'],
    uploading: false,
    failed: false,
    onPhoto: fn(),
    onTextColor: fn(),
    background: { ...noBackground, ...background },
});
const sectionWith = (background: Partial<FeedSectionBackground> = {}): Story => {
    const content = contentWith(background);
    return {
        render: (args, { globals }) => (
            <Sheet {...args} title={copyFor(globals).InvitationEditor.sectionNames.dressCode} content={content} membersOnly={false} />
        ),
    };
};

const sampleSection = (type: 'contact' | 'faq' | 'date'): Story => ({
    render: (args, { globals }) => (
        <SectionSheet {...args} sectionId={`s-${type}`} title={copyFor(globals).InvitationEditor.sectionNames[type]} />
    ),
});

// A block with nothing of its own to edit, shown to members only.
const membersOnlyStory: Story = {
    render: (args, { globals }) => <Sheet {...args} title={copyFor(globals).InvitationEditor.sectionNames.dressCode} membersOnly />,
};

export const PhotoPrompt: Story = {};
export const PhotoPromptMobile: Story = onPhone;

export const InvitationSection: Story = sectionWith();
export const InvitationSectionMobile: Story = { ...sectionWith(), ...onPhone };
export const InvitationSectionBackgroundPhoto: Story = sectionWith({ hasPhoto: true });
// The first background photo didn't upload.
export const InvitationSectionBackgroundFailed: Story = sectionWith({ failed: true });
// A colour the text can't be read on.
export const InvitationSectionBackgroundColor: Story = sectionWith({ color: '#7A3B2E' });

export const Contact: Story = sampleSection('contact');
export const ContactMobile: Story = { ...sampleSection('contact'), ...onPhone };
export const Faq: Story = sampleSection('faq');
export const DateSection: Story = sampleSection('date');

export const MembersOnly: Story = membersOnlyStory;
export const MembersOnlyMobile: Story = { ...membersOnlyStory, ...onPhone };

export const PinnedPhotos: Story = pinnedStory(3);
export const PinnedPhotosMobile: Story = { ...pinnedStory(3), ...onPhone };
export const PinnedPhotosEmpty: Story = pinnedStory(0);
// Six is the most: no Add photo tile.
export const PinnedPhotosFull: Story = pinnedStory(6);
export const PinnedPhotosUploading: Story = pinnedStory(1, true);
