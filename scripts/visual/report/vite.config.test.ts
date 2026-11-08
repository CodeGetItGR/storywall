// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { inlineIntoPage, safeInScript } from './vite.config';

type Bundle = Record<string, { type: 'asset'; source: string } | { type: 'chunk'; code: string }>;

const plugin = inlineIntoPage();

const transform = (html: string) => (plugin.transformIndexHtml as { handler: (html: string) => string }).handler(html);
const generate = (bundle: Bundle) => (plugin.generateBundle as (this: unknown, options: unknown, bundle: Bundle) => void).call({}, {}, bundle);

const page = '<body><script type="module" src="./assets/a.js"></script></body>';

describe('inlineIntoPage', () => {
    it('turns Windows line endings into Unix ones before the build reads the template', () => {
        expect(transform('<div>\r\n</div>\r\n')).toBe('<div>\n</div>\n');
    });

    it('puts the script inside the page and leaves only index.html', () => {
        const bundle: Bundle = { 'index.html': { type: 'asset', source: page }, 'assets/a.js': { type: 'chunk', code: 'x' } };
        generate(bundle);
        expect(Object.keys(bundle)).toEqual(['index.html']);
        expect(bundle['index.html']).toEqual({ type: 'asset', source: '<body><script type="module">x</script></body>' });
    });

    it('fails when the page has no tag for a script', () => {
        const bundle: Bundle = { 'index.html': { type: 'asset', source: '<body></body>' }, 'assets/a.js': { type: 'chunk', code: 'x' } };
        expect(() => generate(bundle)).toThrow(/assets\/a\.js/);
    });

    it('fails when the build leaves another file behind', () => {
        const bundle: Bundle = {
            'index.html': { type: 'asset', source: page },
            'assets/a.js': { type: 'chunk', code: 'x' },
            'assets/b.png': { type: 'asset', source: 'png' },
        };
        expect(() => generate(bundle)).toThrow(/assets\/b\.png/);
    });

    it('puts a stylesheet inside the page as a style', () => {
        const bundle: Bundle = {
            'index.html': { type: 'asset', source: '<head><link rel="stylesheet" href="./assets/a.css"></head>' },
            'assets/a.css': { type: 'asset', source: 'a{color:red}' },
        };
        generate(bundle);
        expect(Object.keys(bundle)).toEqual(['index.html']);
        expect(bundle['index.html']).toEqual({ type: 'asset', source: '<head><style>a{color:red}</style></head>' });
    });

    it('fails when the page has no tag for a stylesheet', () => {
        const bundle: Bundle = {
            'index.html': { type: 'asset', source: '<head></head>' },
            'assets/a.css': { type: 'asset', source: 'a{color:red}' },
        };
        expect(() => generate(bundle)).toThrow(/assets\/a\.css/);
    });
});

describe('safeInScript', () => {
    const run = (code: string) => new Function(`return ${safeInScript(code)}`)() as unknown;

    it('keeps a string holding a script end or a comment start the same', () => {
        expect(run('"</script>"')).toBe('</script>');
        expect(run('"<!--"')).toBe('<!--');
    });

    it('keeps a regular expression that escapes the < working', () => {
        expect(run('/\\<!--/.test("<!--")')).toBe(true);
    });

    it('keeps an escaped backslash before the < as it was', () => {
        expect(run('"\\\\<!--"')).toBe('\\<!--');
    });

    it('leaves nothing in the output that could end the script', () => {
        for (const code of ['"</script>"', '"<!--"', '/\\<!--/', '"\\\\<!--"', '"</SCRIPT>"']) {
            expect(safeInScript(code)).not.toMatch(/<\/script|<!--/i);
        }
    });
});
