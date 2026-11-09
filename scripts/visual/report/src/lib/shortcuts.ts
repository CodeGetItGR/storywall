export type Shortcut = 'next' | 'previous' | 'mark' | 'capture' | 'side' | 'slider' | 'diff' | 'zoom' | 'mode' | 'find' | 'help';

const KEYS = new Map<string, Shortcut>([
    ['ArrowRight', 'next'],
    ['ArrowLeft', 'previous'],
    ['r', 'mark'],
    ['c', 'capture'],
    ['1', 'side'],
    ['2', 'slider'],
    ['3', 'diff'],
    ['z', 'zoom'],
    ['g', 'mode'],
    ['/', 'find'],
    ['?', 'help'],
]);

// Letters go by key position, so the shortcuts also work on a Greek keyboard.
export function shortcutFor({ code, key }: Pick<KeyboardEvent, 'code' | 'key'>): Shortcut | null {
    const name = /^Key[A-Z]$/.test(code) ? code.slice(3).toLowerCase() : key;
    return KEYS.get(name) ?? null;
}
