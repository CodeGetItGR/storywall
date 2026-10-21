import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProAlbumFilePicker } from '@/components/vendors/me/ProAlbumFilePicker';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

afterEach(cleanup);

describe('ProAlbumFilePicker', () => {
    it('hands over the chosen files and clears the input so the same files can be chosen again', () => {
        const onChoose = vi.fn();
        const { container } = render(<ProAlbumFilePicker onChooseAction={onChoose} />);
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });

        fireEvent.change(input, { target: { files: [file] } });

        expect(onChoose).toHaveBeenCalledWith([file]);
        expect(input.value).toBe('');
    });
});
