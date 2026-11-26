import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useLocale } from 'next-intl';
import { useMemo, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { useStore } from 'zustand';

import { copyFor } from '@/.storybook/copy';
import { LONG_NAME, onDark, STORY_THEME, storyInvitationMedia, storyPeople, storySection } from '@/.storybook/invitation';
import { feedCanvasTools } from '@/components/feed/edit/feedCanvasTools';
import { FeedEditBlock } from '@/components/feed/edit/FeedEditBlock';
import { FeedEditInvitationSection } from '@/components/feed/edit/FeedEditInvitationSection';
import { FeedLook } from '@/components/feed/layout/FeedLook';
import { InvitationSection } from '@/components/saveMyDate/invitation/InvitationSection';
import type { PhotoIssue } from '@/hooks/usePhotoSlotUploads';
import type { PhotoUploadSlots } from '@/hooks/usePhotoUploads';
import { PhotoUploadsContext } from '@/hooks/usePhotoUploadsContext';
import { feedBlockControls } from '@/lib/feedEditing';
import { defaultFeedLayout } from '@/lib/feedLayout';
import { feedBackdropSurface, feedPageBackdrop } from '@/lib/feedPageBackdrop';
import { feedPageTheme } from '@/lib/feedPageTheme';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import { type PhotoFieldSlot, removeFieldPhoto } from '@/lib/invitation/photoSlots';
import { createPhotoUploadStore } from '@/lib/invitation/photoUploadStore';
import { buildRenderContext, onPageBackdrop } from '@/lib/invitation/render';
import type { InvitationSection as Section } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { pageToneProps, pageToneStyle } from '@/lib/pageTone';

const noop = () => {};
const DARK: ThemeDesign = {
    ...STORY_THEME,
    backgrounds: { ...STORY_THEME.backgrounds, content: { desktop: { mediaId: 'page-dark' }, mode: 'cover', stableRepeat: false } },
};
const DARK_TONE = { mean: 0.022, dark: 0.005, light: 0.067 };
const darkMedia = () => '/storybook-assets/dark-photo.jpg';
const onPage = <T extends Section>(section: T): T => ({ ...section, style: { ...section.style, background: { kind: 'theme', slot: 'auto' } } });
const ACTIONS = { onToggleVisible: noop, onDelete: noop, onOpenSettings: noop, onMenuOpenChange: noop };

type PhotosStoryProps = {
    section: Section;
    theme?: ThemeDesign;
    // As guests see it, without the tools.
    guest?: boolean;
    // A photo on its way, by its key.
    uploading?: string;
    issue?: PhotoIssue;
    darkPage?: boolean;
};

// One of the feed's photo sections in edit mode, with its photo tools working but for the upload itself.
function PhotosStory({ section, theme = STORY_THEME, guest = false, uploading, issue, darkPage = false }: PhotosStoryProps) {
    const locale = useLocale();
    const [store] = useState(() => {
        const base = defaultFeedLayout();
        return createInvitationEditorStore({ ...base, themeId: 'story', sections: [...base.sections, section] });
    });
    const document = useStore(store, (state) => state.document);
    const [slots] = useState<PhotoUploadSlots>(() => {
        const uploads = createPhotoUploadStore();
        if (uploading) uploads.getState().set(uploading, { percent: 45 });
        return { uploads, upload: async () => {}, canPick: () => false, report: noop, issue };
    });
    const backdrop = useMemo(() => (darkPage ? feedPageBackdrop(document, DARK, darkMedia, DARK_TONE) : null), [darkPage, document]);
    const { tone } = feedPageTheme(null, undefined, backdrop);
    const ctx = useMemo(() => {
        const plain = buildRenderContext(document, theme, storyInvitationMedia);
        const built = backdrop ? onPageBackdrop(plain, feedBackdropSurface(backdrop)) : plain;
        if (guest) return built;
        const onRemovePhoto = (slot: PhotoFieldSlot) => store.getState().edit(removeFieldPhoto(slot.sectionId, slot.path));
        return { ...built, canvasTools: feedCanvasTools({ edit: store.getState().edit, onRemoveElement: noop, onRemovePhoto }) };
    }, [backdrop, document, guest, store, theme]);
    const index = document.sections.findIndex((item) => item.id === section.id);
    const current = document.sections[index];

    return (
        <PhotoUploadsContext.Provider value={slots}>
            <div {...pageToneProps(tone)} style={pageToneStyle(tone)} className={darkPage ? 'bg-[#2f2b2d]' : undefined}>
                <FeedLook ctx={ctx} lang={locale} fontFaces="">
                    {guest ? (
                        <InvitationSection section={current} index={index} ctx={ctx} />
                    ) : (
                        <FeedEditBlock
                            section={current}
                            name={current.name}
                            controls={feedBlockControls(document.sections, current, { rsvpMoves: true })}
                            hasSettings
                            actions={ACTIONS}
                        >
                            <FeedEditInvitationSection section={current} index={index} ctx={ctx} />
                        </FeedEditBlock>
                    )}
                </FeedLook>
            </div>
        </PhotoUploadsContext.Provider>
    );
}

const couple = storySection('coupleProfiles');
const { partnerA, partnerB } = couple.data;
const withPhoto = { source: 'media' as const, mediaId: 'm-g1' };
const bothPhotos = storySection('coupleProfiles', { partnerA: { ...partnerA, photo: withPhoto }, partnerB: { ...partnerB, photo: withPhoto } });
const noPhotos = storySection('coupleProfiles', { partnerA: { ...partnerA, photo: undefined }, partnerB: { ...partnerB, photo: undefined } });
const shaped = (photoShape: ThemeDesign['photoShape']): ThemeDesign => ({ ...STORY_THEME, photoShape });

// The photos hosts put in the feed's Save my date sections: the people's, and a gallery's first ones. Also shows
// FeedPersonPhotoTools, FeedPhotoSlotProgress and FeedPhotoIssue.
const meta = {
    title: 'Feed/Edit/FeedSectionPhotos',
    component: PhotosStory,
    args: { section: bothPhotos },
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-2xl bg-white pb-6">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof PhotosStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Couple: Story = {};
export const CoupleEmpty: Story = { args: { section: noPhotos } };
export const CoupleOnDark: Story = { args: { section: onDark(bothPhotos) } };
export const CoupleEmptyOnDark: Story = { args: { section: onDark(noPhotos) } };
export const CoupleAsGuest: Story = { args: { guest: true } };
// Guests never see an empty place.
export const CoupleEmptyAsGuest: Story = {
    args: { section: noPhotos, guest: true },
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelector('.family-photo')).toBeNull();
    },
};
export const CoupleLongNames: Story = {
    args: {
        section: storySection('coupleProfiles', {
            partnerA: { ...partnerA, name: LONG_NAME, photo: withPhoto },
            partnerB: { ...partnerB, name: 'Κωνσταντίνος', photo: withPhoto },
        }),
    },
};

// The theme's photo shape, and the tools outside it.
export const ShapeCircle: Story = { args: { theme: shaped('circle') } };
export const ShapeDiamond: Story = { args: { theme: shaped('diamond') } };
export const ShapeDiamondEmpty: Story = { args: { theme: shaped('diamond'), section: noPhotos } };

export const Baby: Story = { args: { section: storySection('baby', { babyPhoto: withPhoto }) } };
export const BabyEmpty: Story = { args: { section: storySection('baby', { babyPhoto: undefined }) } };
export const Parents: Story = { args: { section: storySection('parentsPhoto') } };
export const Godparents: Story = { args: { section: storySection('godparents', { godparents: storyPeople(3) }) } };
export const SponsorsOne: Story = { args: { section: storySection('weddingSponsors', { sponsors: storyPeople(1) }) } };
export const SponsorsAsGuest: Story = { args: { section: storySection('weddingSponsors', { sponsors: storyPeople(2) }), guest: true } };

// One on its way, over the photo it replaces; and one that didn't upload.
export const Uploading: Story = { args: { uploading: `field:${couple.id}:partnerA.photo` } };
const failed: PhotoIssue = { problem: 'failed', sectionId: couple.id, key: `field:${couple.id}:partnerB.photo` };
export const Failed: Story = { args: { issue: failed } };
export const FailedOnDark: Story = { args: { section: onDark(noPhotos), issue: failed } };

// Delete leaves the empty place.
export const Deleted: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor.photos;
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getAllByRole('button', { name: copy.gallery.delete })[0]);
        await expect(canvas.getByRole('button', { name: copy.upload })).toBeVisible();
    },
};

const emptyGallery = storySection('gallery', { images: [] });
export const GalleryEmpty: Story = { args: { section: emptyGallery } };
export const GalleryEmptyOnDark: Story = { args: { section: onDark(emptyGallery) } };
export const GalleryFailed: Story = { args: { section: emptyGallery, issue: { problem: 'type', sectionId: emptyGallery.id, key: null } } };
export const GalleryEmptyAsGuest: Story = {
    tags: ['visual-skip'],
    args: { section: emptyGallery, guest: true },
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelector('section')).toBeNull();
    },
};

// On a theme's dark page, the section having no background of its own.
export const DarkPage: Story = { args: { section: onPage(bothPhotos), darkPage: true } };
export const DarkPageEmpty: Story = { args: { section: onPage(noPhotos), darkPage: true } };
