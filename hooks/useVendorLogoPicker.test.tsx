import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVendorLogoPicker } from '@/hooks/useVendorLogoPicker';

const setLogo = vi.fn();
const setRemoveLogo = vi.fn();

beforeEach(() => {
    setLogo.mockReset();
    setRemoveLogo.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
});

function render(props: { file?: File | null; currentLogoUrl?: string | null; removeLogo?: boolean }) {
    return renderHook(() => useVendorLogoPicker({ file: null, currentLogoUrl: null, removeLogo: false, setLogo, setRemoveLogo, ...props }));
}

describe('useVendorLogoPicker', () => {
    it('previews the saved logo, the chosen file, or nothing once removed', () => {
        expect(render({ currentLogoUrl: 'https://cdn/logo.png' }).result.current.previewUrl).toBe('https://cdn/logo.png');
        expect(render({ currentLogoUrl: 'https://cdn/logo.png', file: new File(['x'], 'a.png') }).result.current.previewUrl).toBe('blob:preview');
        expect(render({ currentLogoUrl: 'https://cdn/logo.png', removeLogo: true }).result.current.previewUrl).toBeNull();
    });

    it('a chosen file replaces a pending removal', () => {
        const { result } = render({ currentLogoUrl: 'https://cdn/logo.png', removeLogo: true });
        const file = new File(['x'], 'a.png');
        act(() => result.current.handleChange({ target: { files: [file], value: 'a' } } as never));
        expect(setLogo).toHaveBeenCalledWith(file);
        expect(setRemoveLogo).toHaveBeenCalledWith(false);
    });

    it('remove drops a chosen file, else marks the saved logo for removal', () => {
        render({ file: new File(['x'], 'a.png') }).result.current.handleRemove();
        expect(setLogo).toHaveBeenCalledWith(null);
        render({ currentLogoUrl: 'https://cdn/logo.png' }).result.current.handleRemove();
        expect(setRemoveLogo).toHaveBeenCalledWith(true);
    });
});
