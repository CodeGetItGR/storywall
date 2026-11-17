import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Text an inline script can't contain, or the browser would stop reading it as a script.
// \x3C is valid in strings, templates and regular expressions, and a < that was already escaped keeps its meaning.
// A tagged template's .raw text still changes, because \x3C stays literal there.
export const safeInScript = (code: string) =>
    code.replace(/(\\*)<(\/script|!--)/gi, (_, slashes: string, rest: string) => (slashes.length % 2 ? slashes.slice(1) : slashes) + '\\x3C' + rest);

// Puts the script and styles inside the page, so a report is one file and loads nothing from elsewhere.
export function inlineIntoPage(): Plugin {
    return {
        name: 'inline-into-page',
        enforce: 'post',
        // A template saved with Windows line endings must build the same bytes.
        transformIndexHtml: { order: 'pre', handler: (html) => html.replaceAll('\r\n', '\n') },
        generateBundle(_options, bundle) {
            const page = bundle['index.html'];
            if (page?.type !== 'asset') throw new Error('The build made no index.html');
            let html = String(page.source);
            for (const [name, file] of Object.entries(bundle)) {
                const path = escapeRegExp(name);
                const before = html;
                if (file.type === 'chunk') {
                    html = html.replace(
                        new RegExp(`<script[^>]*src="[^"]*${path}"[^>]*></script>`),
                        () => `<script type="module">${safeInScript(file.code)}</script>`,
                    );
                    if (html === before) throw new Error(`The page has no script tag for ${name}`);
                    delete bundle[name];
                } else if (name.endsWith('.css')) {
                    html = html.replace(new RegExp(`<link[^>]*href="[^"]*${path}"[^>]*>`), () => `<style>${String(file.source)}</style>`);
                    if (html === before) throw new Error(`The page has no link tag for ${name}`);
                    delete bundle[name];
                }
            }
            const left = Object.keys(bundle).filter((name) => name !== 'index.html');
            if (left.length > 0) throw new Error(`The report must be one file, but the build also made: ${left.join(', ')}`);
            // Windows and Linux must build the same bytes.
            page.source = html.replaceAll('\r\n', '\n');
        },
    };
}

export default defineConfig(() => {
    // A development build is much bigger, and the committed page must be the production one.
    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'production') {
        throw new Error('Build the report page with NODE_ENV unset or set to production.');
    }
    return {
        root: fileURLToPath(new URL('.', import.meta.url)),
        base: './',
        // The repo's PostCSS config is Tailwind's, for the app. This page has its own CSS.
        css: { postcss: { plugins: [] } },
        plugins: [react(), inlineIntoPage()],
        build: {
            outDir: 'dist',
            emptyOutDir: true,
            cssCodeSplit: false,
            modulePreload: false,
            rollupOptions: { output: { inlineDynamicImports: true } },
        },
    };
});
