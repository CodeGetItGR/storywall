import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PhotoSlotTool } from '@/components/saveMyDate/editor/photos/PhotoSlotTool';
import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import type { PhotoUploadSlots } from '@/hooks/usePhotoUploads';
import { PhotoUploadsContext } from '@/hooks/usePhotoUploadsContext';
import type { CanvasTools } from '@/lib/invitation/canvasTools';
import { photoFieldSlot, photoSlotKey } from '@/lib/invitation/photoSlots';
import { createPhotoUploadStore } from '@/lib/invitation/photoUploadStore';
import { SAMPLE_DOCUMENT, SAMPLE_THEME } from '@/lib/invitation/samples';
import en from '@/messages/en.json';

vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

const CAMERA: CanvasTools = { photo: (slot, hasPhoto) => <PhotoSlotTool slot={slot} hasPhoto={hasPhoto} /> };
const BABY = SAMPLE_DOCUMENT.sections.find((section) => section.type === 'baby')!;
const SLOT = photoFieldSlot(BABY.id, 'babyPhoto');

function slots(canPick = true): PhotoUploadSlots {
    return { uploads: createPhotoUploadStore(), upload: vi.fn(async () => {}), canPick: vi.fn(() => canPick) };
}

const withBabyPhoto = (id: string) => (id === 'm-baby' ? '/images/baby.png' : undefined);
const noPhotos = () => undefined;

// The baby section as the editor draws it. The photo shows only when it has an address.
function renderBaby(value: PhotoUploadSlots | null, { withPhoto = false, tools = CAMERA } = {}) {
    const document = { ...SAMPLE_DOCUMENT, sections: [BABY] };
    const media = withPhoto ? withBabyPhoto : noPhotos;
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <PhotoUploadsContext.Provider value={value}>
                <InvitationRenderer document={document} theme={SAMPLE_THEME} media={media} canvasTools={tools} />
            </PhotoUploadsContext.Provider>
        </NextIntlClientProvider>,
    );
}

describe('PhotoSlotTool', () => {
    afterEach(cleanup);

    it('shows the empty photo with its camera and sends the picked file', () => {
        const value = slots();
        renderBaby(value);
        const input = screen.getByTestId('photo-slot-input') as HTMLInputElement;
        const opened = vi.spyOn(input, 'click');

        fireEvent.click(screen.getByRole('button', { name: 'Upload photo' }));
        expect(opened).toHaveBeenCalledOnce();
        const file = new File(['x'], 'baby.jpg', { type: 'image/jpeg' });
        fireEvent.change(input, { target: { files: [file] } });

        expect(screen.getByText('Photo')).toBeInTheDocument();
        expect(value.upload).toHaveBeenCalledWith(SLOT, file);
    });

    it('offers to change a photo that is there', () => {
        renderBaby(slots(), { withPhoto: true });

        expect(screen.getByRole('img', { name: 'Μαρία' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Change photo' })).toBeInTheDocument();
    });

    it('opens no file picker when picking is refused', () => {
        const value = slots(false);
        renderBaby(value);
        const opened = vi.spyOn(screen.getByTestId('photo-slot-input'), 'click');

        fireEvent.click(screen.getByRole('button', { name: 'Upload photo' }));

        expect(value.canPick).toHaveBeenCalledOnce();
        expect(opened).not.toHaveBeenCalled();
    });

    it('shows how far the upload is', () => {
        const value = slots();
        renderBaby(value);

        act(() => value.uploads.getState().set(photoSlotKey(SLOT), { percent: 45 }));
        expect(screen.getByRole('progressbar', { name: 'Uploading…' })).toHaveAttribute('aria-valuenow', '45');

        act(() => value.uploads.getState().clear(photoSlotKey(SLOT)));
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('draws nothing for guests', () => {
        renderBaby(null, { tools: {} });

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(document.querySelector('.family-photo')).toBeNull();
    });
});
