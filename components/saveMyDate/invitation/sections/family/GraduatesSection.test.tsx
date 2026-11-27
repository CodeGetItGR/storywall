import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import type { InvitationDocument } from '@/lib/invitation/document';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

vi.mock('embla-carousel-react', () => ({
    default: () => [vi.fn(), { scrollPrev: vi.fn(), scrollNext: vi.fn(), on: vi.fn(), off: vi.fn(), selectedScrollSnap: () => 0 }],
}));
// next/font only works in a Next build.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const media = (id: string) => `/files/${id}.png`;

function renderGraduates(graduates: Extract<InvitationSection, { type: 'graduates' }>['data']['graduates']) {
    const section = { ...SAMPLE_SECTIONS.graduates, data: { title: 'Οι απόφοιτοί μας', graduates } } as InvitationSection;
    const document: InvitationDocument = { ...SAMPLE_DOCUMENT, sections: [section] };
    return render(<InvitationRenderer document={document} theme={SAMPLE_THEME} media={media} />);
}

afterEach(cleanup);

describe('GraduatesSection', () => {
    it("shows each graduate's photo, name, degree and university", () => {
        renderGraduates([
            { id: 'g1', name: 'Μαρία', degree: 'Πτυχίο Νομικής', university: 'ΑΠΘ', photo: { source: 'media', mediaId: 'm-g1' } },
            { id: 'g2', name: 'Νίκος', degree: 'Πτυχίο Πληροφορικής', university: 'ΕΚΠΑ' },
        ]);
        expect(screen.getByText('Οι απόφοιτοί μας')).toBeTruthy();
        expect(screen.getByText('Μαρία')).toBeTruthy();
        expect(screen.getByText('Πτυχίο Νομικής')).toBeTruthy();
        expect(screen.getByText('ΕΚΠΑ')).toBeTruthy();
        // The photo's alt is the graduate's name, as for godparents and sponsors.
        expect(screen.getByRole('img', { name: 'Μαρία' })).toBeTruthy();
    });

    it('leaves out an empty graduate and an empty line for guests', () => {
        renderGraduates([
            { id: 'g1', name: '', degree: '', university: '' },
            { id: 'g2', name: 'Νίκος', degree: '', university: 'ΑΠΘ' },
        ]);
        expect(document.querySelectorAll('.family-godparent')).toHaveLength(1);
        expect(document.querySelectorAll('.family-graduate-detail')).toHaveLength(1);
    });
});
