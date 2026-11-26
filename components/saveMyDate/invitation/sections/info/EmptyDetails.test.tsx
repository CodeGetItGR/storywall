import { cleanup, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { TextRenderer } from '@/lib/invitation/textEditing';
import en from '@/messages/en.json';

// next/font only works when Next compiles the file.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

// jsdom has no ResizeObserver, and the gift section's IBAN box needs one.
vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
});

afterEach(cleanup);

const noMedia = () => undefined;

// Stands in for the editor's text.
const editable: TextRenderer = ({ value }) => <span>{value}</span>;

function draw(section: InvitationSection, renderText?: TextRenderer) {
    return render(
        <NextIntlClientProvider locale="en" messages={en} timeZone="Europe/Athens">
            <InvitationRenderer document={{ ...SAMPLE_DOCUMENT, sections: [section] }} theme={SAMPLE_THEME} media={noMedia} renderText={renderText} />
        </NextIntlClientProvider>,
    ).container;
}

const { accommodation, gift, locations } = SAMPLE_SECTIONS;
const stay = { ...accommodation.data.items[0], website: '', phone: '', email: '' };

const drawStay = (data: Partial<typeof stay>, renderText?: TextRenderer) =>
    draw({ ...accommodation, data: { ...accommodation.data, items: [{ ...stay, ...data }] } }, renderText);

const hrefs = (container: HTMLElement, selector: string) =>
    Array.from(container.querySelectorAll(selector), (link) => link.getAttribute('href'));

describe('A place to stay', () => {
    it('has no contact icons without a phone or email', () => {
        const container = drawStay({ phone: ' ' });
        expect(container.querySelector('.stay-item')).not.toBeNull();
        expect(container.querySelector('.stay-contact-row')).toBeNull();
    });

    it('shows only the icon of the detail it has', () => {
        expect(drawStay({ email: 'stay@example.com' }).querySelectorAll('.stay-icon')).toHaveLength(1);
    });

    it('opens its phone and email', () => {
        const container = drawStay({ phone: '(+30) 22410 12345', email: ' stay@example.com ' });
        expect(hrefs(container, 'a.stay-contact-item')).toEqual(['tel:+302241012345', 'mailto:stay@example.com']);
    });

    it.each(['22410 12345 / 22410 67890', 'στη ρεσεψιόν'])('keeps %s as text, with no number to call', (phone) => {
        const container = drawStay({ phone });
        expect(container.querySelector('.stay-contact-item')).toHaveTextContent(phone);
        expect(container.querySelector('a.stay-contact-item')).toBeNull();
    });

    it('keeps both fields, without links, in the editor', () => {
        const container = drawStay({ phone: '22410 12345' }, editable);
        expect(container.querySelectorAll('.stay-icon')).toHaveLength(2);
        expect(container.querySelector('a.stay-contact-item')).toBeNull();
    });
});

describe('The gift section', () => {
    const copyButton = (iban: string) => draw({ ...gift, data: { ...gift.data, iban } }).querySelector('.gift-copy-btn');

    it('has a copy button only with an IBAN', () => {
        expect(copyButton(' ')).toBeNull();
        expect(copyButton('GR00 0000')).not.toBeNull();
    });
});

describe('The locations section', () => {
    const blank = { ceremony: '', ceremonyAddress: ' ', ceremonyMap: '', reception: '', receptionAddress: '', receptionMap: '' };
    const mapLinks = (data: Partial<typeof blank>) =>
        hrefs(draw({ ...locations, data: { ...locations.data, ...blank, welcomeEnabled: false, ...data } }), '.location-map-row a');

    it('has a map button only for a place to open', () => {
        expect(mapLinks({})).toEqual([]);
        expect(mapLinks({ reception: 'Κτήμα' })).toEqual([expect.stringContaining(encodeURIComponent('Κτήμα'))]);
        expect(mapLinks({ ceremonyMap: 'https://maps.example.com/a' })).toEqual(['https://maps.example.com/a']);
    });
});
