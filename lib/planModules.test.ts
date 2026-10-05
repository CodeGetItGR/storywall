import { Palette } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { getModuleMeta } from '@/lib/planModules';

describe('getModuleMeta', () => {
    it('names the theme module when the registry has no row for it', () => {
        const meta = getModuleMeta('theme', []);
        expect(meta.name).toBe('Theme');
        expect(meta.Icon).toBe(Palette);
    });
});
