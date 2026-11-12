import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { produce } from 'immer';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GallerySettings } from '@/components/saveMyDate/editor/settings/GallerySettings';
import { useGalleryDrag } from '@/hooks/useGalleryDrag';
import type { PhotoUploadSlots } from '@/hooks/usePhotoUploads';
import { PhotoUploadsContext } from '@/hooks/usePhotoUploadsContext';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { InvitationDocument } from '@/lib/invitation/document';
import { photoSlotKey } from '@/lib/invitation/photoSlots';
import { createPhotoUploadStore } from '@/lib/invitation/photoUploadStore';
import type { ImageRef } from '@/lib/invitation/primitives';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { DocumentRecipe } from '@/lib/invitation/sectionSettings';
import en from '@/messages/en.json';

type Gallery = SectionOf<'gallery'>;

const photo = (mediaId: string): ImageRef => ({ source: 'media', mediaId });
const file = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

function slots(): PhotoUploadSlots {
    return { uploads: createPhotoUploadStore(), upload: vi.fn(async () => {}), canPick: vi.fn(() => true), report: vi.fn() };
}

// The gallery's settings over a copy of the sample gallery; its edits apply to that copy.
function renderGallery({ images = [photo('m-1'), photo('m-2')], value = slots() as PhotoUploadSlots | null } = {}) {
    let document: InvitationDocument = {
        ...SAMPLE_DOCUMENT,
        sections: [{ ...SAMPLE_SECTIONS.gallery, data: { ...SAMPLE_SECTIONS.gallery.data, images, layout: 'grid' } }],
    };
    const edit = vi.fn((recipe: DocumentRecipe) => {
        document = produce(document, recipe);
    });
    const scope: SettingsScope<Gallery> = {
        section: document.sections[0] as Gallery,
        edit,
        mode: 'host',
        isAdmin: false,
        theme: SAMPLE_THEME,
        media: (id) => `/media/${id}.jpg`,
        fonts: [],
        draftId: 'draft-1',
        addUploaded: vi.fn(),
    };
    const wrap = (node: ReactNode) => (
        <NextIntlClientProvider locale="en" messages={en}>
            <PhotoUploadsContext.Provider value={value}>{node}</PhotoUploadsContext.Provider>
        </NextIntlClientProvider>
    );
    render(wrap(<GallerySettings scope={scope} />));
    return { value, edit, edited: () => (document.sections[0] as Gallery).data };
}

afterEach(cleanup);

describe('GallerySettings', () => {
    it('changes the layout, and shows the shape only where the cells keep one', () => {
        const { edited } = renderGallery();
        expect(screen.getByRole('radiogroup', { name: 'Shape' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('radio', { name: 'Slideshow' }));
        expect(edited().layout).toBe('carousel');

        fireEvent.click(screen.getByRole('radio', { name: 'Circle' }));
        expect(edited().shape).toBe('round');
    });

    it('lists the photos with their count, and deletes one', () => {
        const { edited } = renderGallery();
        expect(screen.getByText('2/10 photos')).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Photo 2' })).toHaveAttribute('src', '/media/m-2.jpg');

        fireEvent.click(screen.getAllByRole('button', { name: 'Delete photo' })[0]);
        expect(edited().images).toEqual([photo('m-2')]);
    });

    it('adds the picked photos one after another, and only as many as fit', async () => {
        const images = Array.from({ length: 8 }, (_, index) => photo(`p${index}`));
        const { value } = renderGallery({ images });

        fireEvent.click(screen.getByRole('button', { name: 'Add photos' }));
        expect(value!.canPick).toHaveBeenCalledOnce();

        await act(async () => {
            fireEvent.change(screen.getByTestId('gallery-add-input'), { target: { files: [file('a.jpg'), file('b.jpg'), file('c.jpg')] } });
        });
        expect(value!.report).toHaveBeenCalledWith('galleryFull');
        const sent = vi.mocked(value!.upload).mock.calls;
        expect(sent.map(([, picked]) => picked.name)).toEqual(['a.jpg', 'b.jpg']);
        expect(sent.every(([slot]) => slot.kind === 'galleryAdd' && slot.sectionId === SAMPLE_SECTIONS.gallery.id)).toBe(true);
    });

    it('says the gallery is full instead of opening the picker', () => {
        const { value } = renderGallery({ images: Array.from({ length: 10 }, (_, index) => photo(`p${index}`)) });
        fireEvent.click(screen.getByRole('button', { name: 'Add photos' }));
        expect(value!.report).toHaveBeenCalledWith('galleryFull');
        expect(value!.canPick).not.toHaveBeenCalled();
    });

    it('shows the photos still uploading', () => {
        const value = slots();
        value.uploads.getState().set(photoSlotKey({ kind: 'galleryAdd', sectionId: SAMPLE_SECTIONS.gallery.id, id: 'u-1' }), { percent: 40 });
        renderGallery({ value });
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    });

    it('replaces one photo', () => {
        const { value } = renderGallery();
        fireEvent.change(screen.getAllByTestId('gallery-replace-input')[1], { target: { files: [file('new.jpg')] } });
        expect(value!.upload).toHaveBeenCalledWith(
            { kind: 'gallery', sectionId: SAMPLE_SECTIONS.gallery.id, index: 1, photo: photo('m-2') },
            expect.any(File),
        );
    });

    it('leaves the photos out where uploads are not on', () => {
        renderGallery({ value: null });
        expect(screen.getByRole('radiogroup', { name: 'Layout' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Add photos' })).not.toBeInTheDocument();
    });
});

describe('useGalleryDrag', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <NextIntlClientProvider locale="en" messages={en}>
            {children}
        </NextIntlClientProvider>
    );
    const item = (n: number, index?: number) => ({ id: `p${n}`, data: { current: { n, ...(index === undefined ? {} : { sortable: { index } }) } } });

    it('reorders on a drop over another photo, and tells where it went', () => {
        const onReorder = vi.fn();
        const { result } = renderHook(() => useGalleryDrag(3, onReorder), { wrapper });
        const { announcements } = result.current.accessibility;

        expect(announcements.onDragStart({ active: item(1) } as never)).toBe('Picked up photo 1.');
        expect(announcements.onDragOver({ active: item(1), over: item(3, 2) } as never)).toBe('Photo 1 is at place 3 of 3.');
        expect(announcements.onDragEnd({ active: item(1), over: item(3, 2) } as never)).toBe('Dropped photo 1 at place 3 of 3.');
        expect(announcements.onDragCancel({ active: item(1), over: null } as never)).toBe('Photo 1 is back where it was.');

        result.current.onDragEnd({ active: { id: 'a' }, over: { id: 'b' } } as never);
        result.current.onDragEnd({ active: { id: 'a' }, over: null } as never);
        expect(onReorder).toHaveBeenCalledExactlyOnceWith('a', 'b');
    });
});
