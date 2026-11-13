import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDraftServer } from '@/hooks/invitationDraftTestServer';
import { testAuth, WithAuth } from '@/hooks/testAuthContext';
import { EDITOR_TOUR_SEEN_KEY } from '@/lib/invitation/editorTour';
import type { InvitationSection } from '@/lib/invitation/sections';
import en from '@/messages/en.json';

import InvitationEditorPage from './PageClient';

// Hoisted above the imports, so the API client reads it when it loads. Same as TEST_API.
vi.hoisted(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
});

const router = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/save-my-date/editor/draft-1' }));
vi.mock('@/lib/inAppHistory', () => ({ hasInAppPrevious: () => true }));
// next/font only works when Next compiles the file.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));
// jsdom draws no canvas: the photo goes as picked, after a progress report.
const compress = vi.hoisted(() =>
    vi.fn(async (file: File, options: { onProgress?: (percent: number) => void }) => {
        options.onProgress?.(100);
        return file;
    }),
);
vi.mock('browser-image-compression', () => ({ default: compress }));
vi.stubGlobal(
    'ResizeObserver',
    class {
        observe() {}
        disconnect() {}
    },
);
vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
}));

const backend = createDraftServer();

async function openEditor({ signedIn = true } = {}) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <QueryClientProvider client={queryClient}>
                <WithAuth value={testAuth(signedIn ? {} : { user: null })}>
                    <InvitationEditorPage draftId="draft-1" />
                </WithAuth>
            </QueryClientProvider>
        </NextIntlClientProvider>,
    );
    await screen.findByLabelText('Text color');
}

function section(name: string) {
    return screen.getByRole('group', { name });
}

// Picks a file with a slot's camera.
function pick(scope: HTMLElement, label: string, file: File, index = 0) {
    fireEvent.click(within(scope).getAllByRole('button', { name: label })[index]);
    const input = within(scope).getAllByTestId('photo-slot-input')[index] as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
}

const jpeg = (name = 'baby.jpg') => new File(['photo'], name, { type: 'image/jpeg' });

function storedSection<T extends InvitationSection['type']>(type: T) {
    return backend.stored().document.sections.find((item): item is Extract<InvitationSection, { type: T }> => item.type === type)!;
}

// The draft with its gallery emptied.
function withEmptyGallery() {
    const { document } = backend.stored();
    backend.saveElsewhere({
        ...document,
        sections: document.sections.map((item) => (item.type === 'gallery' ? { ...item, data: { ...item.data, images: [] } } : item)),
    });
}

// Every case opens the whole editor and some wait for its autosave, which takes a while when the whole suite runs.
const EDITOR_FLOW_TIMEOUT_MS = 15_000;

describe('Invitation editor: photos', { timeout: EDITOR_FLOW_TIMEOUT_MS }, () => {
    beforeAll(() => backend.server.listen({ onUnhandledRequest: 'error' }));
    beforeEach(() => localStorage.setItem(EDITOR_TOUR_SEEN_KEY, '1'));
    afterEach(() => {
        cleanup();
        backend.reset();
        backend.server.resetHandlers();
        compress.mockClear();
        localStorage.clear();
    });
    afterAll(() => backend.server.close());

    it('uploads a photo to an empty slot, shows it and saves it', async () => {
        await openEditor();
        const baby = section('Baby');

        pick(baby, 'Upload photo', jpeg());

        // Shown from the address the upload answered with, with a camera to change it.
        await waitFor(() => expect(within(baby).getByRole('img', { name: 'Μαρία' })).toHaveAttribute('src', '/images/uploaded-1.jpg'));
        expect(within(baby).getByRole('button', { name: 'Change photo' })).toBeInTheDocument();
        expect(compress).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({ maxWidthOrHeight: 2560 }));
        // jsdom's files reach the fake server without their name.
        expect(backend.uploads).toHaveLength(1);
        await waitFor(() => expect(storedSection('baby').data.babyPhoto).toEqual({ source: 'media', mediaId: 'img-1' }), { timeout: 4000 });
    });

    it('replaces one godparent photo and leaves the other', async () => {
        await openEditor();
        const godparents = section('Godparents');

        pick(godparents, 'Change photo', jpeg('godfather.jpg'));

        await waitFor(() => expect(within(godparents).getByRole('img', { name: 'Γιώργος' })).toHaveAttribute('src', '/images/uploaded-1.jpg'), {
            timeout: 4000,
        });
        await waitFor(
            () =>
                expect(
                    storedSection('godparents').data.godparents.map((person) =>
                        person.photo?.source === 'media' ? person.photo.mediaId : undefined,
                    ),
                ).toEqual(['img-1', undefined]),
            {
                timeout: 4000,
            },
        );
    });

    it('undoes an upload like any other change', async () => {
        await openEditor();
        const baby = section('Baby');
        pick(baby, 'Upload photo', jpeg());
        await within(baby).findByRole('button', { name: 'Change photo' });

        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

        expect(within(baby).getByRole('button', { name: 'Upload photo' })).toBeInTheDocument();
    });

    it('refuses a file of another type before sending it', async () => {
        await openEditor();

        pick(section('Baby'), 'Upload photo', new File(['gif'], 'baby.gif', { type: 'image/gif' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Only JPG, PNG and WebP are allowed.');
        expect(backend.uploads).toEqual([]);
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(screen.queryByText('Only JPG, PNG and WebP are allowed.')).not.toBeInTheDocument();
    });

    it('says when the draft has no room for more photos', async () => {
        backend.refuseUploads(409, 5213);
        await openEditor();

        pick(section('Baby'), 'Upload photo', jpeg());

        expect(await screen.findByRole('alert')).toHaveTextContent("You've reached the photo limit.");
        expect(within(section('Baby')).getByRole('button', { name: 'Upload photo' })).toBeInTheDocument();
    });

    it('says when an upload fails', async () => {
        backend.refuseUploads(502, 5004);
        await openEditor();

        pick(section('Baby'), 'Upload photo', jpeg());

        expect(await screen.findByRole('alert')).toHaveTextContent("The photo didn't upload. Try again.");
    });

    it('asks a visitor to sign in instead of opening the file picker', async () => {
        await openEditor({ signedIn: false });
        const baby = section('Baby');
        const input = within(baby).getByTestId('photo-slot-input');
        const opened = vi.spyOn(input, 'click');

        fireEvent.click(within(baby).getByRole('button', { name: 'Upload photo' }));

        expect(await screen.findByText('Sign in to add photos')).toBeInTheDocument();
        expect(opened).not.toHaveBeenCalled();
        expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
            'href',
            expect.stringContaining(encodeURIComponent('/save-my-date/editor/draft-1')),
        );
    });

    it('puts a camera on the photo section and the couple photos', async () => {
        await openEditor();

        expect(within(section('Photo')).getAllByRole('button', { name: /^(Upload|Change) photo$/ })).toHaveLength(1);
        expect(within(section('Parents')).getAllByRole('button', { name: /^(Upload|Change) photo$/ })).toHaveLength(2);
    });

    it('moves the photo band and saves where it is, undoable', async () => {
        await openEditor();
        const before = storedSection('photo').data.imageY;
        const move = within(section('Photo')).getByRole('button', { name: 'Move photo' });

        const photo = () => within(section('Photo')).getByRole('img');

        fireEvent.keyDown(move, { key: 'ArrowUp' });
        expect(photo()).toHaveStyle({ objectPosition: `50% ${before + 5}%` });
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(photo()).toHaveStyle({ objectPosition: `50% ${before}%` });
        fireEvent.click(screen.getByRole('button', { name: 'Redo' }));

        await waitFor(() => expect(storedSection('photo').data.imageY).toBe(before + 5), { timeout: 4000 });
    });

    it('adds several photos to an empty gallery from the canvas and saves them in order', async () => {
        withEmptyGallery();
        await openEditor();
        const gallery = section('Gallery / Carousel');

        fireEvent.click(within(gallery).getByRole('button', { name: 'Add photos' }));
        fireEvent.change(within(gallery).getByTestId('gallery-add-input'), { target: { files: [jpeg('one.jpg'), jpeg('two.jpg')] } });

        await waitFor(() => expect(within(gallery).getAllByRole('img')).toHaveLength(2), { timeout: 4000 });
        await waitFor(
            () =>
                expect(storedSection('gallery').data.images).toEqual([
                    { source: 'media', mediaId: 'img-1' },
                    { source: 'media', mediaId: 'img-2' },
                ]),
            { timeout: 4000 },
        );
    });

    it('deletes a gallery photo from its settings, undoable', async () => {
        withEmptyGallery();
        await openEditor();
        const gallery = section('Gallery / Carousel');
        fireEvent.click(within(gallery).getByRole('button', { name: 'Add photos' }));
        fireEvent.change(within(gallery).getByTestId('gallery-add-input'), { target: { files: [jpeg('one.jpg')] } });
        await waitFor(() => expect(within(gallery).getAllByRole('img')).toHaveLength(1), { timeout: 4000 });

        fireEvent.click(within(gallery).getByRole('button', { name: 'Section settings' }));
        const settings = screen.getByRole('complementary', { name: 'Gallery / Carousel' });
        expect(within(settings).getByText('1/10 photos')).toBeInTheDocument();
        fireEvent.click(within(settings).getByRole('button', { name: 'Delete photo' }));

        expect(within(settings).getByText('0/10 photos')).toBeInTheDocument();
        expect(within(gallery).getByRole('button', { name: 'Add photos' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(within(settings).getByText('1/10 photos')).toBeInTheDocument();
    });
});
