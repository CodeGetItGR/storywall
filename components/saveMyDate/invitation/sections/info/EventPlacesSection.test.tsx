import { cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvitationSection } from '@/components/saveMyDate/invitation/InvitationSection';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { EventPlace } from '@/lib/invitation/eventPlaces';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import { createSection } from '@/lib/invitation/newSection';
import { buildRenderContext, type RenderContext } from '@/lib/invitation/render';
import { SAMPLE_DOCUMENT, SAMPLE_THEME } from '@/lib/invitation/samples';
import en from '@/messages/en.json';

// next/font only works when Next compiles the file.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

afterEach(cleanup);

const section = createSection('locations', 'WEDDING');
const document: InvitationDocument = { ...SAMPLE_DOCUMENT, sections: [section] };
const labels = INVITATION_LABELS.en;
const places: EventPlace[] = [
    { key: 'a', sessions: ['Ceremony'], name: 'St. Nicholas', address: 'Pine 1, Athens', mapUrl: 'https://maps.example/church' },
    { key: 'b', sessions: ['Reception', 'Party'], name: 'Villa Rosa', address: '', mapUrl: 'https://maps.example/villa' },
];

function draw(ctx: RenderContext) {
    return render(
        <NextIntlClientProvider locale="en" messages={en}>
            <InvitationSection section={section} index={0} ctx={ctx} />
        </NextIntlClientProvider>,
    ).container;
}

const base = { ...buildRenderContext(document, SAMPLE_THEME, () => undefined), labels };

describe('Places on the feed (KAN-293)', () => {
    it('lists each place with its sessions, its address and a map button, never what the section holds', () => {
        const container = draw({ ...base, eventDetails: { iso: null, places } });
        const items = container.querySelectorAll('.location-item');
        expect(items).toHaveLength(2);
        expect(within(items[0] as HTMLElement).getByText('Ceremony')).toBeTruthy();
        expect(within(items[0] as HTMLElement).getByRole('heading', { name: 'St. Nicholas' })).toBeTruthy();
        expect(within(items[0] as HTMLElement).getByText('Pine 1, Athens')).toBeTruthy();
        expect(within(items[1] as HTMLElement).getByText('Reception · Party')).toBeTruthy();
        expect(screen.getAllByRole('link', { name: labels.map }).map((link) => link.getAttribute('href'))).toEqual([
            'https://maps.example/church',
            'https://maps.example/villa',
        ]);
        if (section.type === 'locations' && section.data.ceremony) expect(screen.queryByText(section.data.ceremony)).toBeNull();
    });

    it('takes the whole width with one place', () => {
        const grid = draw({ ...base, eventDetails: { iso: null, places: places.slice(0, 1) } }).querySelector('.location-grid') as HTMLElement;
        expect(grid.style.gridTemplateColumns).toBe('minmax(0, 1fr)');
    });

    it("keeps the Save my date page's own places", () => {
        const container = draw(base);
        expect(container.querySelector('.location-item-church')).not.toBeNull();
    });
});
