// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { packageClosure } from './pack.mjs';

describe('packageClosure', () => {
    let root: string;
    afterEach(() => rmSync(root, { recursive: true, force: true }));

    const pkg = (name: string, body: object) => {
        mkdirSync(join(root, 'node_modules', name), { recursive: true });
        writeFileSync(join(root, 'node_modules', name, 'package.json'), JSON.stringify({ name, ...body }));
    };

    it('follows dependencies and the optional dependencies that are installed', () => {
        root = mkdtempSync(join(tmpdir(), 'visual-pack-'));
        pkg('sharp', { dependencies: { 'detect-libc': '^2', semver: '^7' }, optionalDependencies: { '@img/sharp-linux-x64': '1', '@img/sharp-win32-x64': '1' } });
        pkg('detect-libc', {});
        pkg('semver', {});
        pkg('@img/sharp-linux-x64', { optionalDependencies: { '@img/sharp-libvips-linux-x64': '1' } });
        pkg('@img/sharp-libvips-linux-x64', {});
        pkg('playwright-core', {});
        expect(packageClosure(root, ['playwright-core', 'sharp'])).toEqual([
            '@img/sharp-libvips-linux-x64',
            '@img/sharp-linux-x64',
            'detect-libc',
            'playwright-core',
            'semver',
            'sharp',
        ]);
    });

    it('stops when a required dependency is not installed', () => {
        root = mkdtempSync(join(tmpdir(), 'visual-pack-'));
        pkg('sharp', { dependencies: { 'detect-libc': '^2' } });
        expect(() => packageClosure(root, ['sharp'])).toThrow('Not installed: detect-libc (needed by sharp)');
    });
});
