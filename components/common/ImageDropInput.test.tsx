import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImageDropInput } from '@/components/common/ImageDropInput';
import messages from '@/messages/en.json';

class FakeDataTransfer {
    private list: File[] = [];
    items = { add: (file: File) => this.list.push(file) };
    get files() {
        return this.list;
    }
}

function renderInput() {
    const view = render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <form>
                <ImageDropInput name="photo" accept="image/*" />
            </form>
        </NextIntlClientProvider>,
    );
    const input = view.container.querySelector<HTMLInputElement>('input[name="photo"]')!;
    return { ...view, input };
}

const photo = new File(['x'], 'anna.jpg', { type: 'image/jpeg' });

beforeEach(() => {
    vi.stubGlobal('DataTransfer', FakeDataTransfer);
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('ImageDropInput', () => {
    it('invites a click or a drop', () => {
        renderInput();
        expect(screen.getByText('Add or drop a photo')).toBeInTheDocument();
    });

    it('previews a picked file and removes it', () => {
        const { input } = renderInput();

        fireEvent.change(input, { target: { files: [photo] } });
        expect(screen.getByText('anna.jpg')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
        expect(screen.getByText('Add or drop a photo')).toBeInTheDocument();
    });

    it('puts a dropped image into the input so the form sends it', () => {
        const { input } = renderInput();
        let assigned: unknown = null;
        Object.defineProperty(input, 'files', {
            configurable: true,
            get: () => assigned,
            set: (value) => {
                assigned = value;
            },
        });

        fireEvent.drop(input.closest('label')!, { dataTransfer: { files: [new File(['t'], 'notes.txt', { type: 'text/plain' }), photo] } });

        expect(assigned).toEqual([photo]);
        expect(screen.getByText('anna.jpg')).toBeInTheDocument();
    });

    it('ignores a drop with no image', () => {
        renderInput();
        fireEvent.drop(screen.getByText('Add or drop a photo').closest('label')!, {
            dataTransfer: { files: [new File(['t'], 'notes.txt', { type: 'text/plain' })] },
        });
        expect(screen.getByText('Add or drop a photo')).toBeInTheDocument();
    });
});
