// Builds the runtime pack: the visual CI steps bundled into visual-runtime/ci.mjs, with only the packages they load
// at run time copied next to it. Jobs after the build run `node visual-runtime/ci.mjs <step>` with no npm ci.
//
//   node scripts/visual/pack.mjs     (after npm ci, from the repository root)

import { cpSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACK_DIR = 'visual-runtime';
// Loaded at run time and never bundled: playwright-core finds its own files on disk, and sharp loads a native binary.
export const EXTERNAL = ['playwright-core', 'sharp'];

// Every package `names` needs, from the installed tree: dependencies must be installed, optional ones only if they are.
// npm installs flat, so each package is looked up at the top of node_modules.
export function packageClosure(root, names) {
    const found = new Set();
    const visit = (name, neededBy) => {
        if (found.has(name)) return;
        const file = join(root, 'node_modules', name, 'package.json');
        if (!existsSync(file)) throw new Error(`Not installed: ${name}${neededBy ? ` (needed by ${neededBy})` : ''}`);
        found.add(name);
        const pkg = JSON.parse(readFileSync(file, 'utf8'));
        for (const dependency of Object.keys(pkg.dependencies ?? {})) visit(dependency, name);
        for (const optional of Object.keys(pkg.optionalDependencies ?? {})) {
            if (existsSync(join(root, 'node_modules', optional, 'package.json'))) visit(optional, name);
        }
    };
    for (const name of names) visit(name, null);
    return [...found].sort();
}

async function main() {
    const root = process.cwd();
    const { build } = await import('esbuild');
    rmSync(PACK_DIR, { recursive: true, force: true });
    await build({
        entryPoints: ['scripts/visual/ci.ts'],
        outfile: join(PACK_DIR, 'ci.mjs'),
        bundle: true,
        platform: 'node',
        target: 'node22',
        format: 'esm',
        external: EXTERNAL,
        // Bundled CommonJS code calls require(); give it one.
        banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
        logLevel: 'warning',
    });
    const packages = packageClosure(root, EXTERNAL);
    for (const name of packages) cpSync(join(root, 'node_modules', name), join(PACK_DIR, 'node_modules', name), { recursive: true, dereference: true });
    process.stdout.write(`Packed ${packages.length} packages into ${PACK_DIR}: ${packages.join(', ')}\n`);
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
