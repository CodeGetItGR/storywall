import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Every colour is picked from ColorCircles: no browser or phone colour popup.
describe('colour inputs', () => {
    it('leaves no native colour input in the app', () => {
        const files = ['app', 'components'].flatMap((folder) =>
            readdirSync(folder, { recursive: true, encoding: 'utf8' })
                .filter((file) => file.endsWith('.tsx'))
                .map((file) => join(folder, file)),
        );
        expect(files.length).toBeGreaterThan(100);
        expect(files.filter((file) => /type=\{?["']color["']/.test(readFileSync(file, 'utf8')))).toEqual([]);
    });
});
