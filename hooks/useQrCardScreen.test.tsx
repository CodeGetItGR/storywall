import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    replace: vi.fn(),
    refetch: vi.fn(),
    links: { data: undefined as unknown, isLoading: false },
    templates: { data: undefined as unknown, isLoading: false, isError: false },
}));

vi.mock('next/navigation', () => ({ useParams: () => ({ qrLinkId: 'qr-1' }), useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
}));
vi.mock('@/components/routing/EventRouteGate', () => ({
    useEventRouteContext: () => ({ eventId: 'e1', activeEvent: { title: 'Maria & Nikos' }, isHost: true }),
}));
vi.mock('@/hooks/useQrLinks', () => ({ useEventQrLinks: () => mocks.links }));
vi.mock('@/hooks/useQrCardTemplates', () => ({ useQrCardTemplates: () => ({ ...mocks.templates, refetch: mocks.refetch }) }));

import { useQrCardScreen } from '@/hooks/useQrCardScreen';
import { routes } from '@/lib/routes';

function link(overrides: Record<string, unknown> = {}) {
    return { id: 'qr-1', publicUrl: 'https://storywall.gr/q/tok', targetType: 'EVENT_JOIN', status: 'ACTIVE', ...overrides };
}

beforeEach(() => {
    mocks.replace.mockReset();
    mocks.refetch.mockReset();
    mocks.links = { data: [link()], isLoading: false };
    mocks.templates = { data: { available: true, templates: [] }, isLoading: false, isError: false };
});

describe('useQrCardScreen', () => {
    it('loads until both the links and the designs are in', () => {
        mocks.links = { data: undefined, isLoading: true };
        expect(renderHook(() => useQrCardScreen()).result.current.status).toBe('loading');
        mocks.links = { data: [link()], isLoading: false };
        mocks.templates = { data: undefined, isLoading: true, isError: false };
        expect(renderHook(() => useQrCardScreen()).result.current.status).toBe('loading');
    });

    it('says the code is gone when the link is missing or revoked', () => {
        mocks.links = { data: [link({ id: 'qr-2' })], isLoading: false };
        expect(renderHook(() => useQrCardScreen()).result.current.status).toBe('missing');
        mocks.links = { data: [link({ status: 'REVOKED' })], isLoading: false };
        expect(renderHook(() => useQrCardScreen()).result.current.status).toBe('missing');
    });

    it('fills a share link card from the event', () => {
        const { result } = renderHook(() => useQrCardScreen());
        expect(result.current.status).toBe('ready');
        expect(result.current.qrUrl).toBe('https://storywall.gr/q/tok');
        expect(result.current.designer.text).toEqual({ title: 'Maria & Nikos', line: 'lines.join', giver: '' });
        expect(result.current.lines).toEqual([{ text: 'lines.join', tone: 'body' }]);
        expect(result.current.label).toBe('cardLabel {"title":"Maria & Nikos"}');
        expect(result.current.backHref).toBe(routes.events.invitationsQr('e1'));
    });

    it('fills the gallery card and goes back to the gallery QR', () => {
        mocks.links = { data: [link({ targetType: 'MEDIA_UPLOAD' })], isLoading: false };
        const { result } = renderHook(() => useQrCardScreen());
        expect(result.current.designer.text.line).toBe('lines.gallery');
        expect(result.current.backHref).toBe(routes.events.tools.galleryQr('e1'));
    });

    it('treats an event without QR cards as a page that does not exist', () => {
        mocks.templates = { data: { available: false, templates: [] }, isLoading: false, isError: false };
        const { result } = renderHook(() => useQrCardScreen());
        expect(result.current.unavailable).toBe(true);
        expect(mocks.replace).toHaveBeenCalledWith(routes.eventNotFound);
    });

    it('keeps Plain and offers a retry when the designs fail', () => {
        mocks.templates = { data: undefined, isLoading: false, isError: true };
        const { result } = renderHook(() => useQrCardScreen());
        expect(result.current.status).toBe('ready');
        expect(result.current.templatesFailed).toBe(true);
        act(() => result.current.retryTemplates());
        expect(mocks.refetch).toHaveBeenCalled();
    });
});
