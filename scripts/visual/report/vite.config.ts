import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Text an inline script can't contain, or the browser would stop reading it as a script.
const safeInScript = (code: string) => code.replace(/<\/script/gi, '<\\/script').replaceAll('<!--', '<\\!--');

// Puts the script and styles inside the page, so a report is one file and loads nothing from elsewhere.
function inlineIntoPage(): Plugin {
    return {
        name: 'inline-into-page',
        enforce: 'post',
        generateBundle(_options, bundle) {
            const page = bundle['index.html'];
            if (page?.type !== 'asset') throw new Error('The build made no index.html');
            let html = String(page.source);
            for (const [name, file] of Object.entries(bundle)) {
                const path = escapeRegExp(name);
                if (file.type === 'chunk') {
                    html = html.replace(
                        new RegExp(`<script[^>]*src="[^"]*${path}"[^>]*></script>`),
                        () => `<script type="module">${safeInScript(file.code)}</script>`,
                    );
                    delete bundle[name];
                } else if (name.endsWith('.css')) {
                    html = html.replace(new RegExp(`<link[^>]*href="[^"]*${path}"[^>]*>`), () => `<style>${String(file.source)}</style>`);
                    delete bundle[name];
                }
            }
            // Windows and Linux must build the same bytes.
            page.source = html.replaceAll('\r\n', '\n');
        },
    };
}

export default defineConfig({
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
    },
});
