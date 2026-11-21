import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDangerZoneDownloads } from '@/hooks/useDangerZoneDownloads';
import type { EventModuleResponseDto } from '@/lib/api/types';

vi.mock('@/hooks/useModuleCopy', () => ({
    useModuleCopy: () => (moduleKey: string) => ({ name: `${moduleKey} name` }),
}));

function moduleOf(moduleKey: string, isAvailable = true) {
    return { moduleKey, isAvailable, isEnabled: isAvailable } as EventModuleResponseDto;
}

function render(modules: EventModuleResponseDto[]) {
    return renderHook(() => useDangerZoneDownloads({ id: 'e1', eventType: 'WEDDING', modules } as never));
}

describe('useDangerZoneDownloads', () => {
    it('offers the gallery download and the wishbook link when the plan has them', () => {
        const { result } = render([moduleOf('gallery'), moduleOf('wishbook')]);

        expect(result.current.showGalleryDownload).toBe(true);
        expect(result.current.wishbook).toEqual({ href: '/events/e1/tools/wishbook', label: 'wishbook name' });
    });

    it('offers nothing the plan does not have', () => {
        const { result } = render([moduleOf('gallery', false)]);

        expect(result.current.showGalleryDownload).toBe(false);
        expect(result.current.wishbook).toBeNull();
    });

    it('opens and closes the gallery download window', () => {
        const { result } = render([moduleOf('gallery')]);

        act(() => result.current.openArchive());
        expect(result.current.archiveOpen).toBe(true);
        act(() => result.current.closeArchive());
        expect(result.current.archiveOpen).toBe(false);
    });
});
