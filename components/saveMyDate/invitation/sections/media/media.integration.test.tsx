import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { PhotoFrameElement } from '@/lib/invitation/photoFrame';
import type { MediaResolver } from '@/lib/invitation/render';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

vi.mock('embla-carousel-react', () => ({
    default: () => [vi.fn(), { scrollPrev: vi.fn(), scrollNext: vi.fn(), on: vi.fn(), off: vi.fn(), selectedScrollSnap: () => 0 }],
}));

// next/font only works in a Next build.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const media: MediaResolver = (mediaId) => (mediaId === 'gone' ? undefined : `/files/${mediaId}.png`);

const gallery = SAMPLE_SECTIONS.gallery;
const photo = SAMPLE_SECTIONS.photo;

function renderSections(sections: InvitationSection[]) {
    const document: InvitationDocument = { ...SAMPLE_DOCUMENT, sections };
    return render(<InvitationRenderer document={document} theme={SAMPLE_THEME} media={media} />);
}

afterEach(cleanup);

describe('photo section', () => {
    it('shows the photo at the saved height and position', () => {
        const { container } = renderSections([{ ...photo, style: { ...photo.style, minHeight: 500 }, data: { ...photo.data, imageY: 20 } }]);
        const image = screen.getByRole('img', { name: 'Φωτογραφία της εκδήλωσης' });

        expect(image.getAttribute('src')).toBe('/files/m-photo.png');
        expect(image.style.objectPosition).toBe('50% 20%');
        expect((container.querySelector('.photo-section-inner') as HTMLElement).style.height).toBe('500px');
        expect(container.querySelector('section.photo-section')).toBeTruthy();
    });

    it('falls back to the default height', () => {
        const { container } = renderSections([{ ...photo, style: { ...photo.style, minHeight: undefined } }]);

        expect((container.querySelector('.photo-section-inner') as HTMLElement).style.height).toBe('420px');
    });

    it('renders nothing without a photo', () => {
        const { container } = renderSections([{ ...photo, id: 'empty', data: { imageY: 50 } }]);

        expect(container.querySelector('[data-section-id="empty"]')).toBeNull();
    });
});

describe('gallery section', () => {
    it('shows the title and the photos, numbered', () => {
        renderSections([gallery]);

        expect(screen.getByRole('heading', { name: gallery.data.title })).toBeTruthy();
        expect(screen.getByRole('img', { name: 'Φωτογραφία 1 από 2' }).getAttribute('src')).toBe('/files/m-1.png');
        expect(screen.getByRole('img', { name: 'Φωτογραφία 2 από 2' }).getAttribute('src')).toBe('/files/m-2.png');
    });

    it('opens a photo full screen', async () => {
        renderSections([gallery]);

        fireEvent.click(screen.getByRole('button', { name: 'Φωτογραφία 1 από 2' }));

        expect(await screen.findByRole('dialog', { name: 'Φωτογραφία 1 από 2' })).toBeTruthy();
    });

    it('follows the invitation language', () => {
        const date = { ...SAMPLE_SECTIONS.date, data: { ...SAMPLE_SECTIONS.date.data, displayLanguage: 'en' as const } };
        renderSections([date, { ...gallery, data: { ...gallery.data, layout: 'carousel' } }]);

        expect(screen.getByRole('img', { name: 'Photo 1 of 2' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Next photo' })).toBeTruthy();
    });

    it('renders nothing without photos, and the next section keeps its place', () => {
        const { container } = renderSections([{ ...gallery, id: 'empty', data: { ...gallery.data, images: [] } }, photo]);

        expect(container.querySelector('[data-section-id="empty"]')).toBeNull();
        expect(container.querySelector(`[data-section-id="${photo.id}"]`)).toBeTruthy();
    });

    it('renders nothing when hidden', () => {
        const { container } = renderSections([{ ...gallery, visible: false }]);

        expect(container.querySelector('section')).toBeNull();
    });
});

describe('photo frame', () => {
    const frameSection = SAMPLE_SECTIONS.photoFrame;
    const frame = frameSection.elements[0] as PhotoFrameElement;

    it('shows the photo through the mask, with the art on top', () => {
        const { container } = renderSections([frameSection]);
        const photoSvg = screen.getByRole('img', { name: 'Φωτογραφία της εκδήλωσης' });
        const images = photoSvg.querySelectorAll('image');

        expect(images[0].getAttribute('href')).toBe('/files/m-frame-mask.png');
        expect(images[1].getAttribute('href')).toBe('/files/m-framed.png');
        expect(images[1].getAttribute('mask')).toBe(`url(#${photoSvg.querySelector('mask')?.id})`);
        expect(screen.getByRole('img', { name: 'Οβάλ' }).getAttribute('src')).toBe('/files/m-frame-art.png');
        expect(container.querySelector('.photo-frame-el')?.className).toContain('wedart-frame-anim-fade-in');
    });

    it('keeps the frame shape and the saved size', () => {
        const { container } = renderSections([{ ...frameSection, elements: [{ ...frame, boxScale: 0.5 }] }]);
        const inner = container.querySelector('.photo-frame-inner') as HTMLElement;

        expect(inner.style.aspectRatio).toBe('900 / 1200');
        expect(inner.style.maxWidth).toBe('min(210px, 100%)');
    });

    it('shows a frame added to another section', () => {
        const { container } = renderSections([{ ...SAMPLE_SECTIONS.blank, elements: [frame] }]);

        expect(container.querySelector('.photo-frame-inner')).toBeTruthy();
    });

    it('leaves out a frame with nothing in it, and keeps the texts beside it', () => {
        const text = { id: 'text', kind: 'text' as const, role: 'paragraph' as const, text: 'Κείμενο', style: {} };
        const { container } = renderSections([{ ...SAMPLE_SECTIONS.blank, elements: [{ ...frame, photo: undefined }, text] }]);

        expect(container.querySelector('.photo-frame-inner')).toBeNull();
        expect(screen.getByText('Κείμενο')).toBeTruthy();
    });

    it('renders nothing for a frame section with nothing to show', () => {
        const { container } = renderSections([{ ...frameSection, id: 'empty', elements: [{ ...frame, frameId: '' }] }]);

        expect(container.querySelector('[data-section-id="empty"]')).toBeNull();
    });
});
