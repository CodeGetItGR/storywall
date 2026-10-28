import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const exportMocks = vi.hoisted(() => ({
    standaloneQrCardSvg: vi.fn(),
    qrCardPng: vi.fn(),
    qrCardPdfBytes: vi.fn(),
    saveBlob: vi.fn(),
}));
vi.mock('@/lib/qrCardExport', () => exportMocks);

import { useQrCardExport } from '@/hooks/useQrCardExport';
import type { EventThemeFontDto } from '@/lib/api/types';

const FONT: EventThemeFontDto = { key: 'alegreya', fallback: 'serif', url: '/api/theme-fonts/alegreya/1.woff2' };
// jsdom's Blob may lack arrayBuffer(); the hook only needs that one method.
const PNG = { arrayBuffer: async () => new ArrayBuffer(4) } as unknown as Blob;

function renderExport() {
    const hook = renderHook(() => useQrCardExport({ font: FONT, title: 'Maria & Nikos' }));
    hook.result.current.svgRef.current = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
    return hook;
}

beforeEach(() => {
    exportMocks.standaloneQrCardSvg.mockReset().mockResolvedValue('<svg/>');
    exportMocks.qrCardPng.mockReset().mockResolvedValue(PNG);
    exportMocks.qrCardPdfBytes.mockReset().mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
    exportMocks.saveBlob.mockReset();
});

describe('useQrCardExport', () => {
    it('saves the card as a PNG named after the title', async () => {
        const { result } = renderExport();

        act(() => result.current.savePng());

        expect(result.current.busy).toBe('png');
        await waitFor(() => expect(result.current.busy).toBeNull());
        expect(exportMocks.standaloneQrCardSvg).toHaveBeenCalledWith(result.current.svgRef.current, FONT);
        expect(exportMocks.qrCardPng).toHaveBeenCalledWith('<svg/>');
        expect(exportMocks.saveBlob).toHaveBeenCalledWith(PNG, 'Maria-&-Nikos.png');
        expect(result.current.failed).toBe(false);
    });

    it('saves the card as a PDF', async () => {
        const { result } = renderExport();

        act(() => result.current.savePdf());

        await waitFor(() => expect(exportMocks.saveBlob).toHaveBeenCalled());
        const [file, name] = exportMocks.saveBlob.mock.calls[0];
        expect(name).toBe('Maria-&-Nikos.pdf');
        expect((file as Blob).type).toBe('application/pdf');
    });

    it('says so when a save fails, and lets the next one run', async () => {
        exportMocks.qrCardPng.mockRejectedValueOnce(new Error('tainted'));
        const { result } = renderExport();

        act(() => result.current.savePng());

        await waitFor(() => expect(result.current.failed).toBe(true));
        expect(result.current.busy).toBeNull();
        act(() => result.current.savePng());
        await waitFor(() => expect(exportMocks.saveBlob).toHaveBeenCalledTimes(1));
        expect(result.current.failed).toBe(false);
    });

    it('runs one save at a time', async () => {
        const { result } = renderExport();

        act(() => {
            result.current.savePng();
            result.current.savePdf();
        });

        await waitFor(() => expect(result.current.busy).toBeNull());
        expect(exportMocks.qrCardPng).toHaveBeenCalledTimes(1);
    });
});
