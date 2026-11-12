import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { storyTheme, withEditorChrome } from '@/.storybook/editor';
import { ThemeAssetLibrary } from '@/components/saveMyDate/editor/themeAssets/ThemeAssetLibrary';
import { useInvitationEditorStore } from '@/hooks/useInvitationEditorStore';
import { useThemeAssets } from '@/hooks/useThemeAssets';
import type { ImageUploader } from '@/lib/invitation/editorUploads';

const theme = storyTheme({ ogImageAssetId: 'm-photo' });

const uploads: Record<string, ImageUploader> = {
    // Every upload stores the same picture.
    works: async () => ({ mediaId: 'm-leaf', url: '/images/post-florals.png', width: 800, height: 600 }),
    fails: () => Promise.reject(new Error('too big')),
};

// The library over a real editor store, so adding and removing show at once.
function Library({ upload }: { upload: keyof typeof uploads }) {
    const editor = useInvitationEditorStore(theme.document, theme.design, { imageId: theme.dto.ogImageAssetId });
    const share = editor.share ?? { imageId: null };
    const assets = useThemeAssets({
        store: editor.store,
        design: editor.theme!,
        share,
        uploadImage: uploads[upload],
        addUploaded: noop,
        markRemoved: noop,
    });
    return <ThemeAssetLibrary assets={assets} design={editor.theme!} share={share} media={theme.media} />;
}

function noop() {}

const meta = {
    title: 'SaveMyDate/Editor/ThemeAssetLibrary',
    component: Library,
    decorators: [withEditorChrome],
    args: { upload: 'works' },
} satisfies Meta<typeof Library>;

export default meta;
type Story = StoryObj<typeof meta>;

type AssetsCopy = ReturnType<typeof copyFor>['InvitationEditor']['assets'];

function openTab(canvasElement: HTMLElement, name: string) {
    return userEvent.click(within(canvasElement).getByRole('button', { name }));
}

export const Backgrounds: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        await expect(within(canvasElement).getByRole('button', { name: copy.themeStyle.backgrounds })).toHaveAttribute('aria-pressed', 'true');
        await expect(within(canvasElement).getByRole('heading', { name: copy.sectionSettings.backgroundNumber.replace('{n}', '3') })).toBeVisible();
    },
};

export const Illustrations: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy: AssetsCopy = copyFor(globals).InvitationEditor.assets;
        await openTab(canvasElement, copy.tabs.illustrations);
        await expect(within(canvasElement).getByRole('img', { name: copy.art.main })).toBeVisible();
    },
};

export const Elements: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy: AssetsCopy = copyFor(globals).InvitationEditor.assets;
        await openTab(canvasElement, copy.tabs.elements);
        await expect(within(canvasElement).getByRole('textbox', { name: copy.name })).toBeVisible();
    },
};

export const Frames: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy: AssetsCopy = copyFor(globals).InvitationEditor.assets;
        await openTab(canvasElement, copy.tabs.frames);
        await expect(within(canvasElement).getByRole('button', { name: copy.addFrame })).toBeDisabled();
    },
};

export const Transitions: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy: AssetsCopy = copyFor(globals).InvitationEditor.assets;
        await openTab(canvasElement, copy.tabs.transitions);
        await expect(within(canvasElement).getByRole('button', { name: copy.addTransition })).toBeDisabled();
    },
};

export const ShareImage: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy: AssetsCopy = copyFor(globals).InvitationEditor.assets;
        await openTab(canvasElement, copy.tabs.share);
        await expect(within(canvasElement).getByRole('img', { name: copy.tabs.share })).toBeVisible();
    },
};

// The upload was refused: the slot says so and keeps its image.
export const UploadFailed: Story = {
    args: { upload: 'fails' },
    play: async ({ canvasElement, globals }) => {
        const copy: AssetsCopy = copyFor(globals).InvitationEditor.assets;
        await openTab(canvasElement, copy.tabs.illustrations);
        const input = within(canvasElement).getAllByLabelText(copy.replace)[0];
        await userEvent.upload(input, new File(['x'], 'art.png', { type: 'image/png' }));
        await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent(copy.uploadFailed);
    },
};
