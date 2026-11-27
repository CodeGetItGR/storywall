import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { feedCanvasTools } from '@/components/feed/edit/feedCanvasTools';
import { InvitationSection } from '@/components/saveMyDate/invitation/InvitationSection';
import type { PhotoUploadSlots } from '@/hooks/usePhotoUploads';
import { PhotoUploadsContext } from '@/hooks/usePhotoUploadsContext';
import { opensBlockSettings } from '@/lib/feedEditing';
import type { InvitationElement } from '@/lib/invitation/elements';
import { createSection } from '@/lib/invitation/newSection';
import { photoFieldSlot, photoFrameSlot, photoSlotKey } from '@/lib/invitation/photoSlots';
import { createPhotoUploadStore } from '@/lib/invitation/photoUploadStore';
import type { ImageRef } from '@/lib/invitation/primitives';
import { buildRenderContext } from '@/lib/invitation/render';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection as Section } from '@/lib/invitation/sections';
import en from '@/messages/en.json';

vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

afterEach(cleanup);

const photos = en.InvitationEditor.photos;
const photo: InvitationElement = { id: 'p1', kind: 'image', image: { source: 'media', mediaId: 'img-1' }, width: 320 };
type CoupleSection = Extract<Section, { type: 'coupleProfiles' }>;
const couple = SAMPLE_SECTIONS.coupleProfiles as CoupleSection;
const slot = photoFieldSlot(couple.id, 'partnerA.photo');
const gallery = { ...SAMPLE_SECTIONS.gallery, data: { ...SAMPLE_SECTIONS.gallery.data, images: [] } } as Section;
const framed = (framePhoto: ImageRef | undefined) => {
    const section = createSection('photoFrame', 'WEDDING');
    return { ...section, elements: section.elements.map((element) => ({ ...element, id: 'el-frame', frameId: 'fr-oval', photo: framePhoto })) } as Section;
};
const oneOfTwo: CoupleSection = {
    ...couple,
    data: {
        ...couple.data,
        partnerA: { ...couple.data.partnerA, photo: { source: 'media', mediaId: 'm-1' } },
        partnerB: { ...couple.data.partnerB, photo: undefined },
    },
};

function tools() {
    return { edit: vi.fn(), onRemoveElement: vi.fn(), onRemovePhoto: vi.fn() };
}

function slots(over: Partial<PhotoUploadSlots> = {}): PhotoUploadSlots {
    return { uploads: createPhotoUploadStore(), upload: vi.fn(async () => {}), canPick: () => true, report: vi.fn(), ...over };
}

function show(node: ReactNode, value: PhotoUploadSlots | null = null) {
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <PhotoUploadsContext.Provider value={value}>{node}</PhotoUploadsContext.Provider>
        </NextIntlClientProvider>,
    );
}

function showSection(section: Section, { value = slots(), options = tools(), guest = false } = {}) {
    const built = buildRenderContext(SAMPLE_DOCUMENT, SAMPLE_THEME, (id) => `/media/${id}.jpg`);
    const ctx = guest ? built : { ...built, canvasTools: feedCanvasTools(options) };
    show(
        <div className="smd-invitation">
            <InvitationSection section={section} index={1} ctx={ctx} />
        </div>,
        value,
    );
    return { value, options };
}

describe('feedCanvasTools', () => {
    it('puts a ✕ on an added photo that removes it', () => {
        const options = tools();
        show(feedCanvasTools(options).element?.(photo));
        fireEvent.click(screen.getByRole('button', { name: en.InvitationEditor.sections.delete }));
        expect(options.onRemoveElement).toHaveBeenCalledWith('p1');
    });

    it('draws nothing in other elements', () => {
        const spacer = { id: 's1', kind: 'spacer', height: 24 } as InvitationElement;
        expect(feedCanvasTools(tools()).element?.(spacer)).toBeNull();
    });

    it("adds a photo to a person's empty place", () => {
        const { value } = showSection(oneOfTwo);
        fireEvent.click(screen.getByRole('button', { name: photos.upload }));
        const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
        fireEvent.change(screen.getByTestId('photo-slot-input'), { target: { files: [file] } });
        expect(value.upload).toHaveBeenCalledWith(photoFieldSlot(couple.id, 'partnerB.photo'), file);
    });

    it("changes and deletes a person's photo", () => {
        const { value, options } = showSection(oneOfTwo);
        const file = new File(['x'], 'b.jpg', { type: 'image/jpeg' });
        fireEvent.click(screen.getByRole('button', { name: photos.change }));
        fireEvent.change(screen.getByTestId('person-photo-input'), { target: { files: [file] } });
        expect(value.upload).toHaveBeenCalledWith(slot, file);

        fireEvent.click(screen.getByRole('button', { name: photos.gallery.delete }));
        expect(options.onRemovePhoto).toHaveBeenCalledWith(slot);
    });

    it('shows how far a replacement is, with no tools meanwhile', () => {
        const uploads = createPhotoUploadStore();
        uploads.getState().set(photoSlotKey(slot), { percent: 45 });
        showSection(oneOfTwo, { value: slots({ uploads }) });
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '45');
        expect(screen.queryByRole('button', { name: photos.change })).toBeNull();
    });

    it("says why a person's photo didn't upload, at that person only", () => {
        showSection(oneOfTwo, { value: slots({ issue: { problem: 'size', sectionId: couple.id, key: photoSlotKey(slot) } }) });
        expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toEqual([photos.errors.size]);
    });

    it('shows an empty gallery with its problem in edit mode', () => {
        showSection(gallery, { value: slots({ issue: { problem: 'type', sectionId: gallery.id, key: null } }) });
        expect(screen.getByRole('button', { name: photos.gallery.add })).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent(photos.errors.type);
    });

    it("adds a photo to the theme's empty frame, and says why one isn't in it", () => {
        const key = photoSlotKey(photoFrameSlot('el-frame'));
        const { value } = showSection(framed(undefined), { value: slots({ issue: { problem: 'size', sectionId: null, key } }) });
        fireEvent.click(screen.getByRole('button', { name: photos.upload }));
        const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
        fireEvent.change(screen.getByTestId('photo-slot-input'), { target: { files: [file] } });
        expect(value.upload).toHaveBeenCalledWith(photoFrameSlot('el-frame'), file);
        expect(screen.getByRole('alert')).toHaveTextContent(photos.errors.size);
        expect(screen.queryByTestId('frame-photo-surface')).toBeNull();
    });

    it('moves, zooms and changes the photo in the frame, apart from a tap on the block', () => {
        const { options } = showSection(framed({ source: 'media', mediaId: 'm-1' }));
        expect(screen.getByRole('button', { name: photos.change })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: photos.zoomIn }));
        expect(options.edit).toHaveBeenCalled();
        const block = document.querySelector('section')!;
        expect(opensBlockSettings(screen.getByTestId('frame-photo-surface'), block)).toBe(false);
        expect(opensBlockSettings(block, block)).toBe(true);
    });

    it('shows guests the frame only with its photo, and no tools', () => {
        showSection(framed(undefined), { guest: true });
        expect(document.querySelector('section')).toBeNull();
        cleanup();
        showSection(framed({ source: 'media', mediaId: 'm-1' }), { guest: true });
        expect(document.querySelector('.photo-frame-svg')).toBeInTheDocument();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('shows guests no empty place and no empty gallery', () => {
        showSection(oneOfTwo, { guest: true });
        expect(document.querySelectorAll('.family-photo')).toHaveLength(1);
        expect(screen.queryByRole('button')).toBeNull();
        cleanup();
        showSection(gallery, { guest: true });
        expect(document.querySelector('section')).toBeNull();
    });

    it('names each photo after its person, or plainly when there is no name', () => {
        showSection(oneOfTwo);
        expect(screen.getByRole('img', { name: couple.data.partnerA.name })).toBeInTheDocument();
        cleanup();
        showSection({
            ...couple,
            data: { ...couple.data, partnerA: { ...couple.data.partnerA, name: '', photo: { source: 'media', mediaId: 'm-1' } } },
        });
        const labels = buildRenderContext(SAMPLE_DOCUMENT, SAMPLE_THEME, () => undefined).labels;
        expect(screen.getAllByRole('img', { name: labels.photoAlt }).length).toBeGreaterThan(0);
    });
});
