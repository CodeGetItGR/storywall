import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// PostCard pulls in a dozen hooks and providers, so this reads its source instead of rendering it.
describe('PostCard theme surface', () => {
    it('paints the card and its divider from the theme tokens', () => {
        const source = readFileSync(join(process.cwd(), 'components/feed/PostCard.tsx'), 'utf8');
        const article = source.match(/<article className=\{cn\('([^']*)'/)?.[1];
        expect(article?.split(' ')).toEqual(expect.arrayContaining(['bg-event-card', 'border-event-card-line']));
        expect(article).not.toMatch(/bg-card\/60|border-border\/60/);
    });
});
