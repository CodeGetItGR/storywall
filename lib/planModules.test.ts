import { Palette } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { getModuleMeta, hasModuleCopyOverride, moduleCopyDraft, moduleCopyPatch, resolveModuleCopy } from '@/lib/planModules';

describe('getModuleMeta', () => {
    it('names the theme module when the registry has no row for it', () => {
        const meta = getModuleMeta('theme', []);
        expect(meta.name).toBe('Theme');
        expect(meta.Icon).toBe(Palette);
    });
});

describe('resolveModuleCopy', () => {
    const platform = getModuleMeta('wishbook', []);
    const localize = (text: { en?: string } | null | undefined) => text?.en ?? '';

    it('uses the override, then the translation, then the platform name, field by field', () => {
        const copy = resolveModuleCopy({
            override: { name: { en: 'Memory capsule', el: 'Κάψουλα' }, description: null, cardLabel: null },
            translated: { description: 'Messages from guests.' },
            platform,
            localize,
        });
        expect(copy).toEqual({ name: 'Memory capsule', description: 'Messages from guests.', cardLabel: 'Memory capsule' });
    });

    it('falls back to the platform module without an override or translation', () => {
        const copy = resolveModuleCopy({ override: undefined, translated: {}, platform, localize });
        expect(copy.name).toBe('Wishbook');
        expect(copy.cardLabel).toBe('Wishbook');
    });
});

describe('moduleCopyPatch', () => {
    it('clears a field left empty in both locales and trims the rest', () => {
        const draft = moduleCopyDraft({ name: { en: 'Old', el: 'Παλιό' } });
        draft.name = { en: ' Memory capsule ', el: 'Κάψουλα' };
        expect(moduleCopyPatch(draft)).toEqual({
            patch: { name: { en: 'Memory capsule', el: 'Κάψουλα' }, description: null, cardLabel: null },
        });
    });

    it('flags the empty locale when only one is filled', () => {
        const draft = moduleCopyDraft({});
        draft.cardLabel.en = 'Capsule';
        expect(moduleCopyPatch(draft)).toEqual({ incomplete: { field: 'cardLabel', locale: 'el' } });
    });

    it('tells a row with any override apart from a default one', () => {
        expect(hasModuleCopyOverride({ name: null, description: null, cardLabel: null })).toBe(false);
        expect(hasModuleCopyOverride({ description: { en: 'a', el: 'b' } })).toBe(true);
    });
});
