import { describe, expect, it } from 'vitest';

import { shortcutFor } from './shortcuts';

describe('shortcutFor', () => {
    it.each([
        [{ code: 'ArrowRight', key: 'ArrowRight' }, 'next'],
        [{ code: 'ArrowLeft', key: 'ArrowLeft' }, 'previous'],
        [{ code: 'KeyR', key: 'r' }, 'mark'],
        [{ code: 'KeyC', key: 'c' }, 'capture'],
        [{ code: 'Digit1', key: '1' }, 'side'],
        [{ code: 'Digit2', key: '2' }, 'slider'],
        [{ code: 'Digit3', key: '3' }, 'diff'],
        [{ code: 'KeyZ', key: 'z' }, 'zoom'],
        [{ code: 'KeyG', key: 'g' }, 'mode'],
        [{ code: 'Slash', key: '/' }, 'find'],
        [{ code: 'Slash', key: '?' }, 'help'],
    ])('maps %o', (event, shortcut) => {
        expect(shortcutFor(event)).toBe(shortcut);
    });

    it('matches letters by position on a Greek keyboard', () => {
        expect(shortcutFor({ code: 'KeyR', key: 'ρ' })).toBe('mark');
        expect(shortcutFor({ code: 'KeyC', key: 'ψ' })).toBe('capture');
        expect(shortcutFor({ code: 'KeyZ', key: 'ζ' })).toBe('zoom');
        expect(shortcutFor({ code: 'KeyG', key: 'γ' })).toBe('mode');
    });

    it('ignores other keys', () => {
        expect(shortcutFor({ code: 'KeyQ', key: 'q' })).toBeNull();
        expect(shortcutFor({ code: 'Enter', key: 'Enter' })).toBeNull();
    });
});
