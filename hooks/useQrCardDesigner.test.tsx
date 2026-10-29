import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { describe, expect, it } from 'vitest';

import { useQrCardDesigner } from '@/hooks/useQrCardDesigner';
import type { QrCardTemplateDto } from '@/lib/api/types';
import { PLAIN_QR_CARD_ID, PLAIN_QR_CARD_STYLE } from '@/lib/qrCard';

const LINEN: QrCardTemplateDto = {
    id: 't1',
    name: { en: 'Linen', el: 'Λινό' },
    artworkUrl: '/api/qr-card-artwork/t1/1',
    textColor: '#5A3E2B',
    headingFont: null,
    codeColor: '#1F3A5A',
    centerLogo: false,
};

type Defaults = { title: string; line: string; giver?: string };

function typed(name: string, value: string) {
    return { currentTarget: { name, value } } as unknown as ChangeEvent<HTMLInputElement>;
}

function renderDesigner(templates: QrCardTemplateDto[] = [LINEN], defaults: Defaults = { title: 'Maria & Nikos', line: 'Scan to join' }) {
    return renderHook((props: { templates: QrCardTemplateDto[]; defaults: Defaults }) => useQrCardDesigner(props), {
        initialProps: { templates, defaults },
    });
}

describe('useQrCardDesigner', () => {
    it('starts on Plain with the defaults', () => {
        const { result } = renderDesigner();
        expect(result.current.selectedId).toBe(PLAIN_QR_CARD_ID);
        expect(result.current.style).toEqual(PLAIN_QR_CARD_STYLE);
        expect(result.current.text).toEqual({ title: 'Maria & Nikos', line: 'Scan to join', giver: '' });
        expect(result.current.showGiver).toBe(false);
    });

    it("takes a template's look when picked, and Plain's back", () => {
        const { result } = renderDesigner();
        act(() => result.current.selectTemplate('t1'));
        expect(result.current.selectedId).toBe('t1');
        expect(result.current.style).toMatchObject({ artworkUrl: '/api/qr-card-artwork/t1/1', codeColor: '#1F3A5A', centerLogo: false });
        act(() => result.current.selectTemplate(PLAIN_QR_CARD_ID));
        expect(result.current.style).toEqual(PLAIN_QR_CARD_STYLE);
    });

    it('falls back to Plain when the picked template leaves the list', () => {
        const { result, rerender } = renderDesigner();
        act(() => result.current.selectTemplate('t1'));
        rerender({ templates: [], defaults: { title: 'Maria & Nikos', line: 'Scan to join' } });
        expect(result.current.selectedId).toBe(PLAIN_QR_CARD_ID);
        expect(result.current.style).toEqual(PLAIN_QR_CARD_STYLE);
    });

    it('keeps what the host typed, and lets untouched fields follow their defaults', () => {
        const { result, rerender } = renderDesigner();
        act(() => result.current.handleTextChange(typed('line', 'Table 4')));
        rerender({ templates: [LINEN], defaults: { title: 'Anna & Nikos', line: 'Scan to open your invitation' } });
        expect(result.current.text).toEqual({ title: 'Anna & Nikos', line: 'Table 4', giver: '' });
    });

    it('keeps an emptied field empty', () => {
        const { result } = renderDesigner();
        act(() => result.current.handleTextChange(typed('title', '')));
        expect(result.current.text.title).toBe('');
    });

    it('offers the giver line on the gift card', () => {
        const { result } = renderDesigner([LINEN], { title: 'For Eleni', line: 'Scan to claim', giver: 'The Papadopoulos family' });
        expect(result.current.showGiver).toBe(true);
        expect(result.current.text.giver).toBe('The Papadopoulos family');
        act(() => result.current.handleTextChange(typed('giver', 'Maria')));
        expect(result.current.text.giver).toBe('Maria');
    });
});
