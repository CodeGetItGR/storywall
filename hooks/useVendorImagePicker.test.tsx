import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVendorImagePicker } from '@/hooks/useVendorImagePicker';

const setLogo = vi.fn();
const setRemoveLogo = vi.fn();

beforeEach(() => {
    setLogo.mockReset();
    setRemoveLogo.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
});

function render(props: { file?: File | null; currentUrl?: string | null; remove?: boolean }) {
    return renderHook(() =>
        useVendorImagePicker({ file: null, currentUrl: null, remove: false, setFile: setLogo, setRemove: setRemoveLogo, ...props }),
    );
}

describe('useVendorImagePicker', () => {
    it('previews the saved logo, the chosen file, or nothing once removed', () => {
        expect(render({ currentUrl: 'https://cdn/logo.png' }).result.current.previewUrl).toBe('https://cdn/logo.png');
        expect(render({ currentUrl: 'https://cdn/logo.png', file: new File(['x'], 'a.png') }).result.current.previewUrl).toBe('blob:preview');
        expect(render({ currentUrl: 'https://cdn/logo.png', remove: true }).result.current.previewUrl).toBeNull();
    });

    it('a chosen file replaces a pending removal', () => {
        const { result } = render({ currentUrl: 'https://cdn/logo.png', remove: true });
        const file = new File(['x'], 'a.png');
        act(() => result.current.handleChange({ target: { files: [file], value: 'a' } } as never));
        expect(setLogo).toHaveBeenCalledWith(file);
        expect(setRemoveLogo).toHaveBeenCalledWith(false);
    });

    it('remove drops a chosen file, else marks the saved logo for removal', () => {
        render({ file: new File(['x'], 'a.png') }).result.current.handleRemove();
        expect(setLogo).toHaveBeenCalledWith(null);
        render({ currentUrl: 'https://cdn/logo.png' }).result.current.handleRemove();
        expect(setRemoveLogo).toHaveBeenCalledWith(true);
    });
});
