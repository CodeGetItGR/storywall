import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeAssetLibrary } from '@/components/saveMyDate/editor/themeAssets/ThemeAssetLibrary';
import type { ThemeAssets } from '@/hooks/useThemeAssets';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { PREVIEW_THEME } from '@/lib/saveMyDatePreview';
import en from '@/messages/en.json';

const media = (mediaId: string) => `https://cdn.test/${mediaId}.png`;
const file = (name: string) => new File(['x'], name, { type: 'image/png' });

function fakeAssets(overrides: Partial<ThemeAssets> = {}): ThemeAssets {
    return {
        busy: null,
        failed: null,
        setBackground: vi.fn(async () => undefined),
        setArt: vi.fn(async () => undefined),
        setShare: vi.fn(async () => undefined),
        addElements: vi.fn(async () => undefined),
        addFrame: vi.fn(async () => true),
        addTransition: vi.fn(async () => true),
        rename: vi.fn(),
        remove: vi.fn(),
        ...overrides,
    };
}

function renderLibrary(assets: ThemeAssets, design: ThemeDesign = PREVIEW_THEME, shareImageId: string | null = null) {
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <ThemeAssetLibrary assets={assets} design={design} share={{ imageId: shareImageId }} media={media} />
        </NextIntlClientProvider>,
    );
}

const openTab = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const pick = (input: HTMLElement, ...files: File[]) => fireEvent.change(input, { target: { files } });

beforeEach(() => {
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:preview', revokeObjectURL: () => undefined }));
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('ThemeAssetLibrary', () => {
    it('opens on the backgrounds, a desktop and a mobile image for each', () => {
        const assets = fakeAssets();
        renderLibrary(assets, { ...PREVIEW_THEME, backgrounds: { ...PREVIEW_THEME.backgrounds, top: { ...PREVIEW_THEME.backgrounds.top, desktop: { mediaId: 'bg' } } } });
        expect(screen.getByRole('button', { name: 'Backgrounds' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('img', { name: 'Background 1 · Desktop' })).toHaveAttribute('src', 'https://cdn.test/bg.png');

        const background2 = screen.getByRole('heading', { name: 'Background 2' }).closest('section')!;
        pick(within(background2).getAllByLabelText('Upload')[1], file('mobile.png'));
        expect(assets.setBackground).toHaveBeenCalledWith('content', 'mobile', expect.any(File));
    });

    it('replaces and removes the main illustration', () => {
        const assets = fakeAssets();
        renderLibrary(assets, { ...PREVIEW_THEME, art: { main: { image: { mediaId: 'art' }, scale: 1, animation: 'none' } } });
        openTab('Illustrations');
        expect(screen.getByRole('img', { name: 'Main illustration' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
        expect(assets.setArt).toHaveBeenCalledWith('main', null);
        pick(screen.getAllByLabelText('Replace')[0], file('art.png'));
        expect(assets.setArt).toHaveBeenCalledWith('main', expect.any(File));
    });

    it('says when an upload failed and holds the slot while one is on its way', () => {
        renderLibrary(fakeAssets({ failed: 'art.ceremonyIcon', busy: 'art.welcomeIcon' }), { ...PREVIEW_THEME, art: {} });
        openTab('Illustrations');
        expect(screen.getByRole('alert')).toHaveTextContent("The image didn't upload. Try again.");
        const uploads = screen.getAllByLabelText('Upload');
        expect(uploads[2]).toBeDisabled();
        expect(uploads[1]).toBeEnabled();
    });

    it('adds, renames and removes elements', () => {
        const assets = fakeAssets();
        renderLibrary(assets);
        openTab('Elements');
        fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Leaf' } });
        expect(assets.rename).toHaveBeenCalledWith('elements', 'el-leaf', 'Leaf');
        fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
        expect(assets.remove).toHaveBeenCalledWith('elements', 'el-leaf');
        pick(screen.getByLabelText('Add element'), file('a.png'), file('b.png'));
        expect(assets.addElements).toHaveBeenCalledWith([expect.any(File), expect.any(File)]);
    });

    it('adds a frame once it has its art and its mask, then clears the form', async () => {
        const assets = fakeAssets();
        renderLibrary(assets, { ...PREVIEW_THEME, frames: [] });
        openTab('Frames');
        const add = screen.getByRole('button', { name: 'Add frame' });
        expect(add).toBeDisabled();

        fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Gold' } });
        const [art, mask] = screen.getAllByLabelText('Upload');
        pick(art, file('art.png'));
        expect(add).toBeDisabled();
        pick(mask, file('mask.png'));
        expect(screen.getByRole('img', { name: 'Mask' })).toHaveAttribute('src', 'blob:preview');

        await act(async () => {
            fireEvent.click(add);
        });
        expect(assets.addFrame).toHaveBeenCalledWith('Gold', expect.objectContaining({ name: 'art.png' }), expect.objectContaining({ name: 'mask.png' }));
        expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('');
        expect(add).toBeDisabled();
    });

    it('adds a transition without a mobile image', async () => {
        const assets = fakeAssets();
        renderLibrary(assets, { ...PREVIEW_THEME, transitions: [] });
        openTab('Transitions');
        pick(screen.getAllByLabelText('Upload')[0], file('wave.png'));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Add transition' }));
        });
        expect(assets.addTransition).toHaveBeenCalledWith('', expect.objectContaining({ name: 'wave.png' }), null);
    });

    it('shows and changes the share image', () => {
        const assets = fakeAssets();
        renderLibrary(assets, PREVIEW_THEME, 'og');
        openTab('Share image');
        expect(screen.getByRole('img', { name: 'Share image' })).toHaveAttribute('src', 'https://cdn.test/og.png');
        fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
        expect(assets.setShare).toHaveBeenCalledWith(null);
    });
});
