import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import type { CanvasTools } from '@/lib/invitation/canvasTools';
import type { InvitationDocument } from '@/lib/invitation/document';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { GraduatesStyle, InvitationSection } from '@/lib/invitation/sections';

vi.mock('embla-carousel-react', () => ({
    default: () => [vi.fn(), { scrollPrev: vi.fn(), scrollNext: vi.fn(), on: vi.fn(), off: vi.fn(), selectedScrollSnap: () => 0 }],
}));
// next/font only works in a Next build.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const media = (id: string) => `/files/${id}.png`;
const WITH_PHOTO = { id: 'g1', name: 'Μαρία', degree: 'Πτυχίο Νομικής', university: 'ΑΠΘ', photo: { source: 'media' as const, mediaId: 'm-g1' } };
const NO_PHOTO = { id: 'g2', name: 'Νίκος', degree: 'Πτυχίο Πληροφορικής', university: 'ΕΚΠΑ' };

function renderStyle(style: GraduatesStyle, graduates = [WITH_PHOTO, NO_PHOTO], host = false) {
    const section = { ...SAMPLE_SECTIONS.graduates, data: { title: 'Οι απόφοιτοί μας', style, graduates } } as InvitationSection;
    const document: InvitationDocument = { ...SAMPLE_DOCUMENT, sections: [section] };
    const canvasTools = host ? ({ photo: () => null } as unknown as CanvasTools) : undefined;
    return render(<InvitationRenderer document={document} theme={SAMPLE_THEME} media={media} canvasTools={canvasTools} />);
}

afterEach(cleanup);

describe('Graduates styles', () => {
    it('cap: puts a cap on each photo, none on a graduate without one', () => {
        renderStyle('cap');
        expect(screen.getAllByRole('img', { name: 'Καπέλο αποφοίτησης' })).toHaveLength(1);
        expect(screen.getByText('ΕΚΠΑ')).toBeTruthy();
    });

    it('cap: shows the empty photo with its cap to a host', () => {
        renderStyle('cap', [NO_PHOTO], true);
        expect(screen.getByRole('img', { name: 'Καπέλο αποφοίτησης' })).toBeTruthy();
    });
});
